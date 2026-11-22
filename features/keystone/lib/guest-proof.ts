import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
export const opaqueToken = () => randomBytes(24).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const humanCode = (prefix: string) => `${prefix}-${randomBytes(8).toString('hex').toUpperCase()}`;
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error('SESSION_SECRET required'); return value; }
/** The secret a ticket's QR code carries: derived from the ticket code, so the buyer's order page and email can show it again; only its hash is stored. */
export const ticketToken = (ticketCode: string) => createHmac('sha256', secret()).update(`concerts-ticket\0${ticketCode}`).digest('hex');
/** What the door scans for this ticket: the QR secret, or the printed code for tickets issued before QR codes. */
export const ticketScanValue = (ticket: { ticketCode: string; tokenHash?: string | null }) => (ticket.tokenHash && ticket.tokenHash === digest(ticketToken(ticket.ticketCode)) ? ticketToken(ticket.ticketCode) : ticket.ticketCode);
/** Restaurant cartProof pattern: signed, expiring and resource-bound. */
export function createProof(id: string, expires = Math.floor(Date.now() / 1000) + 604800) {
  const payload = `v1.${id}.${expires}`;
  return `${payload}.${createHmac('sha256', secret()).update(`concerts\0${payload}`).digest('hex')}`;
}
export function verifyProof(proof: string, id: string) {
  const [v, resource, expiry, signature, ...extra] = (proof || '').split('.');
  if (extra.length || v !== 'v1' || resource !== id || !/^\d+$/.test(expiry || '') || Number(expiry) <= Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(createProof(id, Number(expiry)).split('.')[3], 'hex'));
}
export async function ownedHold(context: any, id: string, proof: string) {
  if (!verifyProof(proof, id)) throw new Error('Hold not found');
  const hold = await context.prisma.inventoryHold.findUnique({ where: { id } });
  if (!hold || (hold.customerId && hold.customerId !== context.session?.itemId)) throw new Error('Hold not found');
  return hold;
}
/** True when the signed-in person bought the order, or has confirmed the email address it was bought with. */
export async function sessionOwnsOrder(context: any, order: { customerId?: string | null; guestEmail?: string | null }) {
  const id = context.session?.itemId;
  if (!id) return false;
  if (order.customerId && order.customerId === id) return true;
  const user = await context.prisma.user.findUnique({ where: { id }, select: { email: true, emailVerifiedAt: true } });
  return Boolean(user?.emailVerifiedAt && order.guestEmail && user.email.toLowerCase() === order.guestEmail.toLowerCase());
}
/** An order opens with its signed link (from the email, checkout or lookup) on any device, or for its signed-in buyer. */
export async function ownedOrder(context: any, id: string, proof?: string | null) {
  const order = id ? await context.prisma.ticketOrder.findUnique({ where: { id } }) : null;
  if (!order) throw new Error('Order not found');
  if (proof && verifyProof(proof, id)) return order;
  if (await sessionOwnsOrder(context, order)) return order;
  throw new Error('Order not found');
}

/** jsonb does not preserve key order, so every stored-snapshot hash uses sorted keys. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export const canonicalDigest = (value: unknown) => digest(canonicalJson(value));
