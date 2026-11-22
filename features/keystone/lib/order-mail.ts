import QRCode from 'qrcode';
import { createProof, ticketScanValue } from './guest-proof';
import { emailButton, emailHeading, emailItems, emailLayout, emailMuted, emailParagraph, emailTotals, escapeHtml } from './email-layout';
import { sendStoreMail, storeLink, type MailAttachment, type MailResult } from './mailer';

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);
const at = (value: Date | string | null | undefined, tz: string | null | undefined, o: Intl.DateTimeFormatOptions) => value ? new Intl.DateTimeFormat('en-US', { ...o, timeZone: tz || 'America/Los_Angeles' }).format(new Date(value)) : '';

/** The store's public name and contact, as entered in Settings. */
export async function storeIdentity(context: any) {
  const row = await context.prisma.storeSettings.findFirst({ select: { name: true, supportEmail: true, supportPhone: true, refundPolicy: true } });
  return { name: row?.name || 'Concerts', supportEmail: row?.supportEmail || '', supportPhone: row?.supportPhone || '', refundPolicy: row?.refundPolicy || '' };
}

/** A link that opens the order on any device. It stays good until two months after the show (at least three months). */
export function orderLink(order: { id: string }, showAt?: Date | string | null) {
  const now = Math.floor(Date.now() / 1000);
  const afterShow = showAt ? Math.floor(new Date(showAt).getTime() / 1000) + 60 * 86400 : 0;
  return `${storeLink()}/orders/${order.id}?t=${createProof(order.id, Math.max(now + 90 * 86400, afterShow))}`;
}

async function loadOrder(context: any, orderId: string) {
  return context.prisma.ticketOrder.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { title: true, showAt: true, doorsAt: true, ageRestriction: true, venue: { select: { name: true, address: true, city: true, timezone: true } } } },
      ticket_order: { where: { status: { in: ['valid', 'checked_in'] } }, orderBy: { ticketCode: 'asc' }, select: { ticketCode: true, tokenHash: true, holderName: true, holderEmail: true, status: true, seatInventory: { select: { seat: { select: { label: true } } } } } },
      ticketOrderLine_order: true,
    },
  });
}

function showLines(event: any) {
  if (!event) return '';
  const tz = event.venue?.timezone;
  const when = [at(event.showAt, tz, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), event.doorsAt ? `Doors ${at(event.doorsAt, tz, { hour: 'numeric', minute: '2-digit' })}` : '', event.showAt ? `Show ${at(event.showAt, tz, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}` : ''].filter(Boolean).join(' · ');
  const where = [event.venue?.name, event.venue?.address, event.venue?.city].filter(Boolean).join(', ');
  const age = event.ageRestriction && event.ageRestriction !== 'all_ages' ? `${event.ageRestriction}+ only. Bring ID.` : '';
  return `<p class="em-text" style="margin:0 0 4px;font-family:${FONT};font-size:19px;line-height:26px;font-weight:700;color:#18181b;">${escapeHtml(event.title)}</p>
${emailMuted([when, where, age].filter(Boolean).map(escapeHtml).join('<br>'))}`;
}

/** One ticket: its QR code beside the code, seat and holder. The QR is an inline image attached to the email. */
async function ticketBlocks(tickets: any[]) {
  const attachments: MailAttachment[] = [];
  const blocks: string[] = [];
  for (const [i, t] of tickets.entries()) {
    const cid = `ticket-${i + 1}@tickets`;
    const png = await QRCode.toBuffer(ticketScanValue(t), { type: 'png', width: 360, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
    attachments.push({ filename: `${t.ticketCode}.png`, content: png, cid, contentType: 'image/png' });
    const detail = [t.seatInventory?.seat?.label || 'General admission', t.holderName].filter(Boolean).map(escapeHtml).join(' · ');
    blocks.push(`<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 12px;">
<tr><td class="em-panel" bgcolor="#fafafa" style="padding:16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
<table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>
<td width="132" style="vertical-align:top;"><img src="cid:${cid}" width="120" height="120" alt="QR code for ticket ${escapeHtml(t.ticketCode)}" style="display:block;width:120px;height:120px;border:6px solid #ffffff;background:#ffffff;border-radius:4px;"></td>
<td style="vertical-align:middle;padding-left:12px;font-family:${FONT};">
<div class="em-muted" style="font-size:12px;line-height:18px;letter-spacing:0.04em;text-transform:uppercase;color:#71717a;">Ticket ${i + 1} of ${tickets.length}</div>
<div class="em-text" style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:16px;line-height:24px;font-weight:700;color:#18181b;word-break:break-all;">${escapeHtml(t.ticketCode)}</div>
<div class="em-muted" style="font-size:14px;line-height:20px;color:#52525b;">${detail}</div>
</td></tr></table>
</td></tr></table>`);
  }
  return { html: blocks.join('\n'), attachments };
}

function textTickets(tickets: any[]) {
  return tickets.map((t, i) => `Ticket ${i + 1}: ${t.ticketCode} (${t.seatInventory?.seat?.label || 'General admission'})`).join('\n');
}

/**
 * Emails the buyer their tickets. Sent once per order: the order row is claimed first, so the browser return and the
 * payment webhook cannot both send it. A failed send releases the claim so the next replay or a staff resend tries again.
 */
export async function deliverOrderConfirmation(context: any, orderId: string, options: { force?: boolean } = {}): Promise<MailResult> {
  const prisma = context.prisma;
  try {
    if (!options.force) {
      const claim = await prisma.ticketOrder.updateMany({ where: { id: orderId, confirmationSentAt: null, guestEmail: { not: '' } }, data: { confirmationSentAt: new Date() } });
      if (claim.count !== 1) return { sent: false, error: 'already_sent' };
    }
    const order = await loadOrder(context, orderId);
    if (!order?.guestEmail) return { sent: false, error: 'no_recipient' };
    const store = await storeIdentity(context);
    const url = orderLink(order, order.event?.showAt);
    const cur = order.currencyCode;
    const tickets = order.ticket_order;
    const qr = await ticketBlocks(tickets);
    const comp = order.status === 'comp';
    const totals = [
      { label: 'Tickets', value: money(order.subtotalCents, cur) },
      ...(order.discountCents ? [{ label: 'Discount', value: `-${money(order.discountCents, cur)}` }] : []),
      ...(order.serviceFeesCents ? [{ label: 'Service fees', value: money(order.serviceFeesCents, cur) }] : []),
      ...(order.facilityFeesCents ? [{ label: 'Facility fees', value: money(order.facilityFeesCents, cur) }] : []),
      ...(order.taxCents ? [{ label: 'Tax', value: money(order.taxCents, cur) }] : []),
      { label: comp ? 'Total' : 'Total paid', value: money(order.totalCents, cur) },
    ];
    const count = tickets.length === 1 ? 'ticket' : 'tickets';
    const html = emailLayout({
      storeName: store.name,
      supportEmail: store.supportEmail,
      preheader: `${tickets.length} ${count} for ${order.event?.title || 'your show'}. Order ${order.orderNumber}.`,
      title: tickets.length === 1 ? 'Your ticket' : `Your ${tickets.length} tickets`,
      body: `${emailParagraph(`Thanks, ${escapeHtml(order.guestName || 'there')}. Your order <strong>${escapeHtml(order.orderNumber)}</strong> is confirmed.`)}
${showLines(order.event)}
${emailHeading(tickets.length === 1 ? 'Ticket' : 'Tickets')}
${qr.html}
${emailMuted('Show the QR code at the door, on your phone or printed. Each code lets one person in, once.')}
${emailButton('View order', url)}
${emailHeading('Receipt')}
${emailItems(order.ticketOrderLine_order.map((l: any) => ({ title: l.title, detail: [l.levelName, l.phaseName, l.seatLabel].filter(Boolean).join(' · '), quantity: l.quantity, amount: money(l.unitPriceCents * l.quantity, cur) })))}
${emailTotals(totals)}
${emailMuted(`From the order page you can see these tickets again and send one to someone else.${store.refundPolicy ? `<br><br>${escapeHtml(store.refundPolicy)}` : ''}`)}`,
    });
    const text = `Your order ${order.orderNumber} is confirmed.\n\n${order.event?.title || ''}\n${textTickets(tickets)}\n\nTotal ${money(order.totalCents, cur)}\n\nView order: ${url}`;
    const result = await sendStoreMail({ to: order.guestEmail, storeName: store.name, subject: `Your ${count} for ${order.event?.title || 'the show'} (order ${order.orderNumber})`, html, text, attachments: qr.attachments });
    if (result.sent) await prisma.ticketOrder.update({ where: { id: orderId }, data: { confirmationSentAt: new Date(), confirmationMessageId: result.messageId || '' } });
    else {
      console.error('Order confirmation email failed:', orderId, result.error);
      if (!options.force) await prisma.ticketOrder.update({ where: { id: orderId }, data: { confirmationSentAt: null } });
    }
    return result;
  } catch (error) {
    // The order is already paid; a mail failure must never fail the purchase.
    console.error('Order confirmation email failed:', orderId, error instanceof Error ? error.message : 'unknown');
    if (!options.force) await prisma.ticketOrder.updateMany({ where: { id: orderId }, data: { confirmationSentAt: null } }).catch(() => undefined);
    return { sent: false, error: error instanceof Error ? error.message : 'send_failed' };
  }
}

/** Tells the new holder they have a ticket, with its QR code. The sender's order page is not shared with them. */
export async function sendTransferEmail(context: any, input: { orderId: string; ticketCode: string; fromCode: string }): Promise<MailResult> {
  try {
    const order = await loadOrder(context, input.orderId);
    const ticket = order?.ticket_order.find((t: any) => t.ticketCode === input.ticketCode);
    if (!order || !ticket?.holderEmail) return { sent: false, error: 'no_recipient' };
    const store = await storeIdentity(context);
    const qr = await ticketBlocks([ticket]);
    const html = emailLayout({
      storeName: store.name,
      supportEmail: store.supportEmail,
      preheader: `${order.guestName || 'Someone'} sent you a ticket for ${order.event?.title || 'a show'}.`,
      title: 'You have a ticket',
      body: `${emailParagraph(`${escapeHtml(order.guestName || 'Someone')} sent you a ticket${ticket.holderName ? `, ${escapeHtml(ticket.holderName)}` : ''}.`)}
${showLines(order.event)}
${emailHeading('Ticket')}
${qr.html}
${emailMuted('Show the QR code at the door, on your phone or printed. It lets one person in, once. Keep this email: it is your ticket.')}`,
    });
    const text = `${order.guestName || 'Someone'} sent you a ticket for ${order.event?.title || 'a show'}.\n\n${textTickets([ticket])}\n\nShow this code at the door.`;
    const result = await sendStoreMail({ to: ticket.holderEmail, storeName: store.name, subject: `Your ticket for ${order.event?.title || 'the show'}`, html, text, attachments: qr.attachments });
    if (!result.sent) console.error('Ticket transfer email failed:', input.orderId, result.error);
    return result;
  } catch (error) {
    console.error('Ticket transfer email failed:', input.orderId, error instanceof Error ? error.message : 'unknown');
    return { sent: false, error: 'send_failed' };
  }
}

/** Tells the buyer money is on its way back, and whether their tickets still work. */
export async function sendRefundEmail(context: any, input: { orderId: string; amountCents: number; full: boolean; cash?: boolean }): Promise<MailResult> {
  try {
    const order = await loadOrder(context, input.orderId);
    if (!order?.guestEmail) return { sent: false, error: 'no_recipient' };
    const store = await storeIdentity(context);
    const amount = money(input.amountCents, order.currencyCode);
    const html = emailLayout({
      storeName: store.name,
      supportEmail: store.supportEmail,
      preheader: `${amount} refunded for order ${order.orderNumber}.`,
      title: input.full ? 'Your order was refunded' : 'You have a refund',
      body: `${emailParagraph(`We refunded <strong>${escapeHtml(amount)}</strong> for order <strong>${escapeHtml(order.orderNumber)}</strong>.`)}
${showLines(order.event)}
${emailParagraph(input.cash ? 'The refund was paid in cash at the box office.' : 'The money goes back to the card you paid with. Banks usually show it within 5 to 10 business days.')}
${emailParagraph(input.full ? 'The tickets on this order no longer work at the door.' : 'Your tickets still work at the door.')}
${emailButton('View order', orderLink(order, order.event?.showAt))}`,
    });
    const result = await sendStoreMail({ to: order.guestEmail, storeName: store.name, subject: `Refund of ${amount} for order ${order.orderNumber}`, html, text: `We refunded ${amount} for order ${order.orderNumber}.` });
    if (!result.sent) console.error('Refund email failed:', input.orderId, result.error);
    return result;
  } catch (error) {
    console.error('Refund email failed:', input.orderId, error instanceof Error ? error.message : 'unknown');
    return { sent: false, error: 'send_failed' };
  }
}
