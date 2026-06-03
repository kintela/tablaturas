import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  obtenerEtiquetaArchivo,
  TIPOS_ARCHIVO_DESCARGABLES,
  type TipoArchivoDescargable,
} from "@/lib/archivos-tablatura";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarCorreoPedidoConfirmado } from "@/lib/email/enviar-correo-pedido-confirmado";
import { getStripeServerClient } from "@/lib/stripe/server";

function obtenerValidadoPorAppBanco(charge: Stripe.Charge | null) {
  const threeDSecure = charge?.payment_method_details?.card?.three_d_secure;

  if (
    threeDSecure?.result === "authenticated" &&
    threeDSecure.authentication_flow === "challenge"
  ) {
    return "si";
  }

  return "no";
}

async function cargarItemsCorreoPedido(pedidoId: string) {
  const { data: compras, error: comprasError } = await supabaseAdmin
    .from("compras")
    .select("tablatura_id, importe_pagado_centimos, moneda")
    .eq("pedido_id", pedidoId)
    .eq("estado", "pagada");

  if (comprasError) {
    throw comprasError;
  }

  const comprasPagadas = compras ?? [];
  const tablaturaIds = comprasPagadas.map((compra) => compra.tablatura_id);

  if (tablaturaIds.length === 0) {
    return [];
  }

  const [{ data: tablaturas, error: tablaturasError }, { data: archivos, error: archivosError }] =
    await Promise.all([
        supabaseAdmin
          .from("tablaturas")
          .select("id, grupo_id, titulo_cancion, grupos(nombre)")
          .in("id", tablaturaIds),
        supabaseAdmin
          .from("archivos_tablatura")
          .select("tablatura_id, bucket, ruta, tipo_archivo, es_principal, orden")
          .in("tablatura_id", tablaturaIds)
          .in("tipo_archivo", [...TIPOS_ARCHIVO_DESCARGABLES]),
      ]);

  if (tablaturasError) {
    throw tablaturasError;
  }

  if (archivosError) {
    throw archivosError;
  }

  const archivosPorTablatura = new Map<
    string,
    Array<{
      bucket: string;
      ruta: string;
      tipo_archivo: TipoArchivoDescargable;
      es_principal: boolean;
      orden: number;
    }>
  >();

  for (const archivo of archivos ?? []) {
    const actuales = archivosPorTablatura.get(archivo.tablatura_id) ?? [];
    actuales.push({
      bucket: archivo.bucket,
      ruta: archivo.ruta,
      tipo_archivo: archivo.tipo_archivo as TipoArchivoDescargable,
      es_principal: archivo.es_principal,
      orden: archivo.orden,
    });
    archivosPorTablatura.set(archivo.tablatura_id, actuales);
  }

  const tablaturasPorId = new Map(
    (tablaturas ?? []).map((tablatura) => [tablatura.id, tablatura])
  );

  return Promise.all(
    comprasPagadas.map(async (compra) => {
      const tablatura = tablaturasPorId.get(compra.tablatura_id);
      const archivosDescargables = [...(archivosPorTablatura.get(compra.tablatura_id) ?? [])].sort(
        (a, b) => {
          if (a.es_principal === b.es_principal) {
            return a.orden - b.orden;
          }

          return a.es_principal ? -1 : 1;
        }
      );
      const archivosDescarga = await Promise.all(
        archivosDescargables.map(async (archivo) => {
          const { data } = await supabaseAdmin.storage
            .from(archivo.bucket)
            .createSignedUrl(
              archivo.ruta,
              Number(process.env.PEDIDO_DOWNLOAD_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7)
            );

          return {
            tipo: archivo.tipo_archivo,
            etiqueta: obtenerEtiquetaArchivo(archivo.tipo_archivo),
            url: data?.signedUrl ?? null,
          };
        })
      );

      const grupo = Array.isArray(tablatura?.grupos)
        ? tablatura.grupos[0]
        : tablatura?.grupos;

      return {
        titulo: tablatura?.titulo_cancion ?? "Partitura",
        grupoNombre: grupo?.nombre ?? "Grupo sin nombre",
        precioCentimos: compra.importe_pagado_centimos,
        moneda: compra.moneda,
        archivosDescarga,
      };
    })
  );
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 400 });
  }

  try {
    const stripe = getStripeServerClient();
    const body = await request.text();

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const pedidoId = session.metadata?.pedido_id;

      if (pedidoId) {
        const referenciaPago =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.id;

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        const fechaPago = new Date().toISOString();
        let validadoporappbanco: "si" | "no" = "no";

        if (paymentIntentId) {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge"],
          });

          const latestCharge =
            paymentIntent.latest_charge &&
            typeof paymentIntent.latest_charge !== "string"
              ? paymentIntent.latest_charge
              : null;

          validadoporappbanco = obtenerValidadoPorAppBanco(latestCharge);
        }

        const { data: pedidoActualizado, error: pedidoError } = await supabaseAdmin
          .from("pedidos")
          .update({
            estado: "pagado",
            referencia_pago: referenciaPago,
            checkout_session_id: session.id,
            payment_intent_id: paymentIntentId,
            fecha_pago: fechaPago,
            proveedor_pago: "stripe",
            validadoporappbanco,
          })
          .eq("id", pedidoId)
          .eq("estado", "pendiente")
          .select("id")
          .maybeSingle();

        if (pedidoError) {
          throw pedidoError;
        }

        if (!pedidoActualizado) {
          return NextResponse.json({ received: true });
        }

        const { error: comprasError } = await supabaseAdmin
          .from("compras")
          .update({
            estado: "pagada",
            fecha_pago: fechaPago,
          })
          .eq("pedido_id", pedidoId)
          .eq("estado", "pendiente");

        if (comprasError) {
          throw comprasError;
        }

        const destinatario =
          session.customer_details?.email || session.customer_email || null;

        if (destinatario) {
          try {
            const itemsCorreo = await cargarItemsCorreoPedido(pedidoId);

            if (itemsCorreo.length > 0) {
              await enviarCorreoPedidoConfirmado({
                pedidoId,
                destinatario,
                nombreCliente: session.customer_details?.name,
                items: itemsCorreo,
              });
            }
          } catch (error) {
            console.error("No se pudo enviar el correo de confirmación del pedido.", {
              pedidoId,
              error,
            });
          }
        }
      }
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const pedidoId = session.metadata?.pedido_id;

      if (pedidoId) {
        const { error: pedidoError } = await supabaseAdmin
          .from("pedidos")
          .update({
            estado: "fallido",
            checkout_session_id: session.id,
            proveedor_pago: "stripe",
          })
          .eq("id", pedidoId)
          .eq("estado", "pendiente");

        if (pedidoError) {
          throw pedidoError;
        }

        const { error: comprasError } = await supabaseAdmin
          .from("compras")
          .update({
            estado: "fallida",
          })
          .eq("pedido_id", pedidoId)
          .eq("estado", "pendiente");

        if (comprasError) {
          throw comprasError;
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo procesar el webhook.";

    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
