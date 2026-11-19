/**
 * Alert hooks (all optional):
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID -> Telegram sendMessage
 *   ALERT_WEBHOOK_URL                      -> POST {level, key, text, ts} as JSON (Slack/Discord-compatible "text")
 * The same key alerts at most once per ALERT_COOLDOWN_MIN (default 30).
 */
const last = new Map<string, number>();

export type Level = "info" | "warn" | "error";

export async function alert(level: Level, key: string, text: string): Promise<void> {
  const line = `[keeper:${level}] ${text}`;
  (level === "error" ? console.error : console.log)(line);
  if (level === "info" && process.env.ALERT_INFO !== "true") return;
  const cooldown = Number(process.env.ALERT_COOLDOWN_MIN || 30) * 60_000;
  const prev = last.get(key);
  if (prev && Date.now() - prev < cooldown) return;
  last.set(key, Date.now());
  const jobs: Promise<unknown>[] = [];
  const tg = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (tg && chat) {
    jobs.push(fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `Alloy ${line}`, disable_web_page_preview: true }),
    }));
  }
  if (process.env.ALERT_WEBHOOK_URL) {
    jobs.push(fetch(process.env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ level, key, text: `Alloy ${line}`, ts: new Date().toISOString() }),
    }));
  }
  const res = await Promise.allSettled(jobs);
  for (const r of res) if (r.status === "rejected") console.error(`alert delivery failed: ${String(r.reason)}`);
}
