import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase/admin";
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

    if (event.type === "checkout.session.completed") {
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

        const { error: pedidoError } = await supabaseAdmin
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
          .eq("id", pedidoId);

        if (pedidoError) {
          throw pedidoError;
        }

        const { error: comprasError } = await supabaseAdmin
          .from("compras")
          .update({
            estado: "pagada",
            fecha_pago: fechaPago,
          })
          .eq("pedido_id", pedidoId);

        if (comprasError) {
          throw comprasError;
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
