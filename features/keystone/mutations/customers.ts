import { createProof, verifyProof, digest } from '../lib/guest-proof';
import { emailButton, emailLayout, emailMuted, emailParagraph } from '../lib/email-layout';
import { sendStoreMail, storeLink } from '../lib/mailer';
import { storeIdentity } from '../lib/order-mail';

// The confirmation link is bound to the person and to the exact address, and lasts three days.
const confirmKey = (userId: string, email: string) => `confirm-${userId}-${digest(email.toLowerCase()).slice(0, 24)}`;

/** Emails the signed-in customer a link that proves the address is theirs. Orders bought with that address then show in the account. */
export async function sendEmailConfirmation(_: any, __: any, context: any) {
  const id = context.session?.itemId;
  if (!id) throw new Error('Sign in first');
  const user = await context.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, emailVerifiedAt: true, emailConfirmationSentAt: true } });
  if (!user) throw new Error('Sign in first');
  if (user.emailVerifiedAt) return { sent: false, verified: true };
  if (user.emailConfirmationSentAt && Date.now() - new Date(user.emailConfirmationSentAt).getTime() < 60000) throw new Error('We just sent that email. Check your inbox, or try again in a minute.');
  const store = await storeIdentity(context);
  const proof = createProof(confirmKey(user.id, user.email), Math.floor(Date.now() / 1000) + 3 * 86400);
  const url = `${storeLink()}/account/confirm?u=${encodeURIComponent(user.id)}&p=${encodeURIComponent(proof)}`;
  const result = await sendStoreMail({
    to: user.email,
    storeName: store.name,
    subject: `Confirm your email for ${store.name}`,
    html: emailLayout({
      storeName: store.name,
      supportEmail: store.supportEmail,
      preheader: 'Confirm your email to see your tickets in your account.',
      title: 'Confirm your email',
      body: `${emailParagraph('Confirm this address to finish setting up your account. Tickets you already bought with it will show in your order history.')}
${emailButton('Confirm email', url)}
${emailMuted('The link works for three days. If you did not create an account, you can ignore this email.')}`,
    }),
    text: `Confirm your email for ${store.name}: ${url}`,
  });
  if (!result.sent) throw new Error('The confirmation email could not be sent. Try again in a minute.');
  await context.prisma.user.update({ where: { id }, data: { emailConfirmationSentAt: new Date() } });
  return { sent: true, verified: false, messageId: result.messageId || null };
}

/** Opening the emailed link confirms the address. Works on any device, signed in or not. */
export async function confirmCustomerEmail(_: any, { userId, proof }: any, context: any) {
  const user = userId ? await context.prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true, email: true, emailVerifiedAt: true } }) : null;
  if (!user || !verifyProof(String(proof || ''), confirmKey(user.id, user.email))) throw new Error('This confirmation link is not valid or has expired. Send a new one from your account.');
  if (!user.emailVerifiedAt) await context.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  const orders = await context.prisma.ticketOrder.count({ where: { guestEmail: user.email.toLowerCase(), status: { in: ['paid', 'partially_refunded', 'refunded', 'comp'] } } });
  return { confirmed: true, orders };
}
