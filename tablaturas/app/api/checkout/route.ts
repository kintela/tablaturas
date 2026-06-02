import { NextResponse } from "next/server";

import { getUsuarioYPerfilActual } from "@/lib/supabase/auth";
import { getStripeServerClient } from "@/lib/stripe/server";

type CheckoutBody = {
  items?: Array<{ id: string }>;
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
    const itemIds = Array.from(
      new Set(
        (body.items ?? [])
          .map((item) => item.id?.trim())
          .filter((itemId): itemId is string => Boolean(itemId))
      )
    );

    if (itemIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const { data: tablaturas, error: tablaturasError } = await supabase
      .from("tablaturas")
      .select(
        "id, titulo_cancion, precio_venta_centimos, moneda, publicada, grupos(nombre)"
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
      .select("tablatura_id")
      .eq("usuario_id", user.id)
      .eq("estado", "pagada")
      .in("tablatura_id", itemIds);

    if (comprasPreviasError) {
      throw comprasPreviasError;
    }

    if ((comprasPrevias ?? []).length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ya habías comprado al menos una de las tablaturas del carrito.",
        },
        { status: 400 }
      );
    }

    const moneda = tablaturas[0]?.moneda ?? "EUR";
    const importeTotalCentimos = tablaturas.reduce(
      (acumulado, tablatura) => acumulado + tablatura.precio_venta_centimos,
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

    const filasCompras = tablaturas.map((tablatura) => ({
      usuario_id: user.id,
      tablatura_id: tablatura.id,
      pedido_id: pedido.id,
      importe_pagado_centimos: tablatura.precio_venta_centimos,
      moneda: tablatura.moneda,
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
      customer_email: user.email ?? undefined,
      metadata: {
        pedido_id: pedido.id,
        usuario_id: user.id,
      },
      line_items: tablaturas.map((tablatura) => {
        const grupo = Array.isArray(tablatura.grupos)
          ? tablatura.grupos[0]
          : tablatura.grupos;

        return {
          quantity: 1,
          price_data: {
            currency: tablatura.moneda.toLowerCase(),
            unit_amount: tablatura.precio_venta_centimos,
            product_data: {
              name: tablatura.titulo_cancion,
              description: grupo?.nombre
                ? `Partitura de batería de ${grupo.nombre}`
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
