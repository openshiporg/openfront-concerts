import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
export const opaqueToken = () => randomBytes(24).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const humanCode = (prefix: string) => `${prefix}-${randomBytes(8).toString('hex').toUpperCase()}`;
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error('SESSION_SECRET required'); return value; }
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
export async function ownedOrder(context: any, id: string, proof: string) {
  if (!verifyProof(proof, id)) throw new Error('Order not found');
  const order = await context.prisma.ticketOrder.findUnique({ where: { id } });
  if (!order || (order.customerId && order.customerId !== context.session?.itemId)) throw new Error('Order not found');
  return order;
}
