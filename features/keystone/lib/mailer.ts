import { createTransport } from "nodemailer";

// One SMTP transport for every transactional email the store sends.
const transport = createTransport({
  // @ts-ignore nodemailer accepts the port as a string
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

export type MailAttachment = { filename: string; content: Buffer; cid: string; contentType: string };
export type MailResult = { sent: boolean; messageId?: string; response?: string; error?: string };

/** Link base for emails: the public storefront address. */
export function storeLink(): string {
  return (process.env.SMTP_STORE_LINK || process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

/** "Store name <address>" so the inbox shows the store, not a bare no-reply address. */
export function fromAddress(storeName?: string): string {
  const from = process.env.SMTP_FROM || "";
  if (!storeName || from.includes("<")) return from;
  return `"${storeName.replace(/["\\\r\n]/g, "")}" <${from}>`;
}

/** Sends one email and reports what the mail server answered; never throws. */
export async function sendStoreMail(message: { to: string; subject: string; html: string; text?: string; storeName?: string; attachments?: MailAttachment[] }): Promise<MailResult> {
  if (!process.env.SMTP_HOST) return { sent: false, error: "Email delivery is not set up" };
  try {
    const { storeName, ...rest } = message;
    const info: any = await transport.sendMail({ ...rest, from: fromAddress(storeName) });
    return { sent: true, messageId: typeof info?.messageId === "string" ? info.messageId : undefined, response: typeof info?.response === "string" ? info.response.slice(0, 300) : undefined };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message.slice(0, 300) : "send_failed" };
  }
}
