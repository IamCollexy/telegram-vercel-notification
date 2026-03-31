import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendTelegramMessage } from "./lib/telegram";

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

  const {
    reference,
    providerReference,
    status, // "success" | "failed"
    amount,
    currency,
    provider,
    paidAt,
  } = req.body;

  if (!reference || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const isSuccess = status === "success";

  const message = [
    isSuccess ? `✅ <b>Payment Successful</b>` : `❌ <b>Payment Failed</b>`,
    ``,
    `💰 Amount: ${currency ?? "NGN"} ${Number(amount ?? 0).toLocaleString()}`,
    `🏦 Provider: ${provider ?? "N/A"}`,
    `🔖 Reference: <code>${reference}</code>`,
    providerReference
      ? `🔗 Provider Ref: <code>${providerReference}</code>`
      : null,
    paidAt ? `🕐 Paid At: ${new Date(paidAt).toUTCString()}` : null,
    !isSuccess ? `⚠️ No funds credited to wallet.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendTelegramMessage(message);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[notify-payment-webhook]", err.message);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}
