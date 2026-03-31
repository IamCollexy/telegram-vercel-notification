import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendTelegramMessage } from "./lib/telegram";

// Simple shared-secret guard — add NOTIFY_SECRET to both .env files
function isAuthorized(req: VercelRequest): boolean {
  const secret = req.headers["x-notify-secret"];
  return secret === process.env.NOTIFY_SECRET;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { reference, amount, currency, provider, customerEmail, customerName } =
    req.body;

  if (!reference || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const message = [
    `🔔 <b>Payment Initiated</b>`,
    ``,
    `👤 Customer: ${customerName ?? "N/A"} (${customerEmail ?? "N/A"})`,
    `💰 Amount: ${currency ?? "NGN"} ${Number(amount).toLocaleString()}`,
    `🏦 Provider: ${provider ?? "N/A"}`,
    `🔖 Reference: <code>${reference}</code>`,
    `🕐 Time: ${new Date().toUTCString()}`,
  ].join("\n");

  try {
    await sendTelegramMessage(message);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[notify-payment-initiated]", err.message);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}
