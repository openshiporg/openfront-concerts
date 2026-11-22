'use server'

import { emailButton, emailLayout, emailMuted, emailParagraph } from "./email-layout";
import { sendStoreMail, storeLink } from "./mailer";

function passwordResetEmail({ url, storeName }: { url: string; storeName?: string }): string {
  return emailLayout({
    storeName,
    preheader: "Use this link to choose a new password.",
    title: "Reset your password",
    body: `${emailParagraph("We received a request to reset the password for your account. Use the button below to choose a new one.")}
${emailButton("Reset password", url)}
${emailMuted("If you did not request this, you can safely ignore this email. Your password will not change.")}`,
  });
}

/** Staff reset on the dashboard; customers (no staff role) reset on the storefront. */
export async function sendPasswordResetEmail(resetToken: string, to: string, options: { customer?: boolean; storeName?: string } = {}): Promise<void> {
  const path = options.customer ? "/account/reset" : "/dashboard/reset";
  const result = await sendStoreMail({
    to,
    storeName: options.storeName,
    subject: "Reset your password",
    html: passwordResetEmail({ url: `${storeLink()}${path}?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}`, storeName: options.storeName }),
  });
  if (!result.sent) throw new Error(result.error || "The reset email could not be sent");
}
