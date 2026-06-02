import { NextResponse } from "next/server";

import { enviarCorreoPedidoConfirmado } from "@/lib/email/enviar-correo-pedido-confirmado";
import { esAdminActual } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  try {
    if (!(await esAdminActual())) {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Debes indicar un email de destino." },
        { status: 400 }
      );
    }

    await enviarCorreoPedidoConfirmado({
      pedidoId: "TEST-SMTP-LOCAL",
      destinatario: email,
      nombreCliente: "Prueba local",
      items: [
        {
          titulo: "Dream On",
          grupoNombre: "Aerosmith",
          precioCentimos: 50,
          moneda: "EUR",
          downloadUrl: "https://example.com/descarga-prueba.pdf",
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Correo de prueba enviado a ${email}.`,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo enviar el correo de prueba.";

    console.error("Error enviando correo SMTP de prueba:", error);

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
