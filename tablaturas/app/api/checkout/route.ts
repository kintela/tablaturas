import { NextResponse } from "next/server";

import { getUsuarioYPerfilActual } from "@/lib/supabase/auth";
import { getStripeServerClient } from "@/lib/stripe/server";

type CheckoutBody = {
  items?: Array<{ id: string; tipoCompra?: "pdf" | "pack" }>;
};

function obtenerOrigenApp(request: Request) {
  const configurado =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configurado) {
    return configurado.replace(/\/+$/, "");
  }

  const origin = new URL(request.url).origin;

  if (origin.includes("localhost")) {
    return "http://127.0.0.1:3000";
  }

  return origin;
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getUsuarioYPerfilActual();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Debes iniciar sesión para comprar." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CheckoutBody;
    const items = (body.items ?? [])
      .map((item) => ({
        id: item.id?.trim(),
        tipoCompra: item.tipoCompra === "pack" ? "pack" : "pdf",
      }))
      .filter((item): item is { id: string; tipoCompra: "pdf" | "pack" } => Boolean(item.id));

    const clavesItems = Array.from(
      new Set(items.map((item) => `${item.id}:${item.tipoCompra}`))
    );
    const itemIds = Array.from(new Set(items.map((item) => item.id)));

    if (clavesItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const { data: tablaturas, error: tablaturasError } = await supabase
      .from("tablaturas")
      .select(
        "id, titulo_cancion, precio_venta_centimos, precio_venta_centimos_pack, moneda, publicada, grupos(nombre)"
      )
      .in("id", itemIds)
      .eq("publicada", true);

    if (tablaturasError) {
      throw tablaturasError;
    }

    if (!tablaturas || tablaturas.length !== itemIds.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Alguna de las tablaturas del carrito ya no está disponible.",
        },
        { status: 400 }
      );
    }

    const { data: comprasPrevias, error: comprasPreviasError } = await supabase
      .from("compras")
      .select("tablatura_id, tipo_compra")
      .eq("usuario_id", user.id)
      .eq("estado", "pagada")
      .in("tablatura_id", itemIds);

    if (comprasPreviasError) {
      throw comprasPreviasError;
    }

    const comprasPreviasSet = new Set(
      (comprasPrevias ?? []).map((compra) => `${compra.tablatura_id}:${compra.tipo_compra}`)
    );

    const compraIncompatible = items.some((item) => {
      if (comprasPreviasSet.has(`${item.id}:${item.tipoCompra}`)) {
        return true;
      }

      if (item.tipoCompra === "pdf" && comprasPreviasSet.has(`${item.id}:pack`)) {
        return true;
      }

      return false;
    });

    if (compraIncompatible) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya habías comprado al menos una de las tablaturas del carrito.",
        },
        { status: 400 }
      );
    }

    const tablaturasPorId = new Map(tablaturas.map((tablatura) => [tablatura.id, tablatura]));
    const itemsCheckout = items.map((item) => {
      const tablatura = tablaturasPorId.get(item.id);

      if (!tablatura) {
        throw new Error("Alguna de las tablaturas del carrito ya no está disponible.");
      }

      const precio =
        item.tipoCompra === "pack"
          ? tablatura.precio_venta_centimos_pack
          : tablatura.precio_venta_centimos;

      return {
        ...item,
        tablatura,
        precio,
      };
    });

    const moneda = tablaturas[0]?.moneda ?? "EUR";
    const importeTotalCentimos = itemsCheckout.reduce(
      (acumulado, item) => acumulado + item.precio,
      0
    );

    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        usuario_id: user.id,
        importe_total_centimos: importeTotalCentimos,
        moneda,
        estado: "pendiente",
        proveedor_pago: "stripe",
      })
      .select("id")
      .single();

    if (pedidoError || !pedido) {
      throw pedidoError ?? new Error("No se pudo crear el pedido.");
    }

    const filasCompras = itemsCheckout.map((item) => ({
      usuario_id: user.id,
      tablatura_id: item.tablatura.id,
      pedido_id: pedido.id,
      tipo_compra: item.tipoCompra,
      importe_pagado_centimos: item.precio,
      moneda: item.tablatura.moneda,
      estado: "pendiente",
    }));

    const { error: comprasError } = await supabase.from("compras").insert(filasCompras);

    if (comprasError) {
      throw comprasError;
    }

    const stripe = getStripeServerClient();
    const origin = obtenerOrigenApp(request);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancelado?pedido_id=${pedido.id}`,
      payment_method_options: {
        card: {
          request_three_d_secure: "challenge",
        },
      },
      customer_email: user.email ?? undefined,
      metadata: {
        pedido_id: pedido.id,
        usuario_id: user.id,
      },
      line_items: itemsCheckout.map((item) => {
        const grupo = Array.isArray(item.tablatura.grupos)
          ? item.tablatura.grupos[0]
          : item.tablatura.grupos;

        return {
          quantity: 1,
          price_data: {
            currency: item.tablatura.moneda.toLowerCase(),
            unit_amount: item.precio,
            product_data: {
              name:
                item.tipoCompra === "pack"
                  ? `${item.tablatura.titulo_cancion} - Pack PDF + MIDI`
                  : `${item.tablatura.titulo_cancion} - PDF`,
              description: grupo?.nombre
                ? item.tipoCompra === "pack"
                  ? `Partitura de batería y MIDI General de ${grupo.nombre}`
                  : `Partitura de batería de ${grupo.nombre}`
                : "Partitura de batería",
            },
          },
        };
      }),
    });

    const { error: actualizarPedidoError } = await supabase
      .from("pedidos")
      .update({
        checkout_session_id: session.id,
      })
      .eq("id", pedido.id);

    if (actualizarPedidoError) {
      throw actualizarPedidoError;
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo iniciar el proceso de pago.";

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
