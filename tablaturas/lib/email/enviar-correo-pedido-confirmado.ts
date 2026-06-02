import nodemailer from "nodemailer";

type ItemCorreoPedido = {
  titulo: string;
  grupoNombre: string;
  precioCentimos: number;
  moneda: string;
  downloadUrl: string | null;
};

type EnviarCorreoPedidoConfirmadoParams = {
  pedidoId: string;
  destinatario: string;
  nombreCliente?: string | null;
  items: ItemCorreoPedido[];
};

function formatearPrecio(precioCentimos: number, moneda: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: moneda,
  }).format(precioCentimos / 100);
}

function escaparHtml(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function construirHtml({
  pedidoId,
  nombreCliente,
  items,
}: EnviarCorreoPedidoConfirmadoParams) {
  const total = items.reduce((acumulado, item) => acumulado + item.precioCentimos, 0);
  const moneda = items[0]?.moneda ?? "EUR";
  const saludo = nombreCliente?.trim() ? `Hola ${escaparHtml(nombreCliente)},` : "Hola,";

  const lineas = items
    .map((item) => {
      const descarga = item.downloadUrl
        ? `<p style="margin:12px 0 0;"><a href="${item.downloadUrl}" style="color:#111827;font-weight:600;">Descargar PDF</a></p>`
        : `<p style="margin:12px 0 0;color:#6b7280;">El enlace de descarga no se ha podido generar automáticamente. Responde a este correo si lo necesitas.</p>`;

      return `
        <li style="margin:0 0 20px;padding:0 0 20px;border-bottom:1px solid #e5e7eb;list-style:none;">
          <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">${escaparHtml(item.grupoNombre)}</p>
          <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#111827;">${escaparHtml(item.titulo)}</p>
          <p style="margin:8px 0 0;color:#111827;">${escaparHtml(
            formatearPrecio(item.precioCentimos, item.moneda)
          )}</p>
          ${descarga}
        </li>
      `;
    })
    .join("");

  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#6b7280;">Pedido confirmado</p>
        <h1 style="margin:16px 0 0;font-size:32px;line-height:1.1;">Tu compra está lista</h1>
        <p style="margin:24px 0 0;font-size:16px;line-height:1.7;">${saludo}</p>
        <p style="margin:16px 0 0;font-size:16px;line-height:1.7;">
          Hemos confirmado tu pago. Debajo tienes el resumen de la compra y los enlaces para descargar tus partituras en PDF.
        </p>

        <div style="margin:24px 0 0;padding:16px 20px;background:#f9fafb;border-radius:16px;">
          <p style="margin:0;font-size:14px;color:#6b7280;">Pedido</p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:#111827;">${escaparHtml(
            pedidoId
          )}</p>
          <p style="margin:12px 0 0;font-size:14px;color:#6b7280;">Total</p>
          <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#111827;">${escaparHtml(
            formatearPrecio(total, moneda)
          )}</p>
        </div>

        <ul style="margin:32px 0 0;padding:0;">
          ${lineas}
        </ul>

        <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
          Los enlaces de descarga son personales y caducan automáticamente.
        </p>
      </div>
    </div>
  `;
}

function construirTexto({
  pedidoId,
  nombreCliente,
  items,
}: EnviarCorreoPedidoConfirmadoParams) {
  const total = items.reduce((acumulado, item) => acumulado + item.precioCentimos, 0);
  const moneda = items[0]?.moneda ?? "EUR";
  const cabecera = nombreCliente?.trim() ? `Hola ${nombreCliente},` : "Hola,";

  const lineas = items
    .map((item, indice) => {
      const descarga = item.downloadUrl
        ? `Descarga: ${item.downloadUrl}`
        : "Descarga: no se ha podido generar el enlace automáticamente.";

      return [
        `${indice + 1}. ${item.grupoNombre} - ${item.titulo}`,
        `Precio: ${formatearPrecio(item.precioCentimos, item.moneda)}`,
        descarga,
      ].join("\n");
    })
    .join("\n\n");

  return [
    cabecera,
    "",
    "Hemos confirmado tu pago.",
    `Pedido: ${pedidoId}`,
    `Total: ${formatearPrecio(total, moneda)}`,
    "",
    "Partituras compradas:",
    "",
    lineas,
    "",
    "Los enlaces de descarga son personales y caducan automáticamente.",
  ].join("\n");
}

export async function enviarCorreoPedidoConfirmado(
  params: EnviarCorreoPedidoConfirmadoParams
) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false") === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from =
    process.env.PEDIDOS_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim();

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      "Faltan variables SMTP y/o PEDIDOS_FROM_EMAIL para enviar el correo del pedido."
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from,
    to: params.destinatario,
    subject: "Tu compra de partituras está confirmada",
    html: construirHtml(params),
    text: construirTexto(params),
    headers: {
      "X-Pedido-Id": params.pedidoId,
    },
  });
}
