export type DealType = 'flat_guarantee' | 'versus' | 'plus' | 'door_deal';
export type SettlementInput = {
  grossCents: number; taxCents: number; passthroughFeesCents: number;
  cappedExpensesCents: number; uncappedExpensesCents: number; expenseCapCents: number;
  guaranteeCents: number; percentageBps: number; promoterProfitBps: number;
  depositsPaidCents: number; merchSoftCents?: number; merchHardCents?: number;
  merchSplitBps?: number; hardMerchSplitBps?: number; dealType: DealType;
};
export function integer(value: number, label: string, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`${label} must be a non-negative safe integer`);
  return value;
}
export function percentage(amount: number, bps: number) {
  integer(bps, 'Basis points', 10000);
  if (!Number.isSafeInteger(amount)) throw new Error('Amount must be safe integer cents');
  const product = BigInt(amount) * BigInt(bps);
  // Mathematical floor, including losses in versus/door calculations.
  const zero = BigInt(0), d = BigInt(10000);
  const cents = product >= zero ? product / d : (product - BigInt(9999)) / d;
  return { cents: Number(cents), remainder: Number(product - cents * d) };
}
export function computeSettlement(input: SettlementInput) {
  for (const [key, value] of Object.entries(input)) if (key !== 'dealType' && value !== undefined) integer(value as number, key, key.endsWith('Bps') ? 10000 : Number.MAX_SAFE_INTEGER);
  const netBoxOfficeCents = input.grossCents - input.taxCents - input.passthroughFeesCents;
  const cappedExpensesCents = Math.min(input.cappedExpensesCents, input.expenseCapCents);
  const totalExpensesCents = cappedExpensesCents + input.uncappedExpensesCents;
  const profit = percentage(Math.max(0, netBoxOfficeCents), input.promoterProfitBps);
  const breakevenCents = totalExpensesCents + input.guaranteeCents + profit.cents;
  const splitBase = input.dealType === 'door_deal' ? netBoxOfficeCents : input.dealType === 'plus' ? Math.max(0, netBoxOfficeCents - breakevenCents) : netBoxOfficeCents - totalExpensesCents;
  const share = percentage(splitBase, input.percentageBps);
  const artistTotalCents = input.dealType === 'flat_guarantee' ? input.guaranteeCents : input.dealType === 'versus' ? Math.max(input.guaranteeCents, share.cents) : input.dealType === 'plus' ? input.guaranteeCents + share.cents : share.cents;
  const soft = percentage(input.merchSoftCents || 0, input.merchSplitBps || 0);
  const hard = percentage(input.merchHardCents || 0, input.hardMerchSplitBps || 0);
  const merchVenueShareCents = soft.cents + hard.cents;
  const result = { netBoxOfficeCents, cappedExpensesCents, totalExpensesCents, breakevenCents, splitPointCents: splitBase, artistGuaranteeCents: input.guaranteeCents, artistOverageCents: Math.max(0, artistTotalCents - input.guaranteeCents), artistTotalCents, merchVenueShareCents, depositsPaidCents: input.depositsPaidCents, balanceDueArtistCents: artistTotalCents - input.depositsPaidCents, promoterNetCents: netBoxOfficeCents - totalExpensesCents - artistTotalCents + merchVenueShareCents };
  if (Object.values(result).some(value => !Number.isSafeInteger(value))) throw new Error('Settlement exceeds safe integer cents');
  return { ...result, rounding: [{ label: 'Promoter profit', numerator: profit.remainder }, { label: 'Artist split', numerator: share.remainder }, { label: 'Soft merchandise', numerator: soft.remainder }, { label: 'Hard merchandise', numerator: hard.remainder }] };
}
export function ticketQuote(input: { priceCents: number; feeCents: number; facilityFeeCents: number; quantity: number; taxBps: number; discountBps?: number; discountFixedCents?: number }) {
  for (const [k, v] of Object.entries(input)) integer(v, k, k.endsWith('Bps') ? 10000 : Number.MAX_SAFE_INTEGER);
  if (input.quantity < 1 || input.quantity > 100) throw new Error('Invalid quantity');
  const subtotalCents = input.priceCents * input.quantity;
  const serviceFeesCents = input.feeCents * input.quantity;
  const facilityFeesCents = input.facilityFeeCents * input.quantity;
  const discountCents = Math.min(subtotalCents, percentage(subtotalCents, input.discountBps || 0).cents + (input.discountFixedCents || 0));
  const taxCents = percentage(subtotalCents - discountCents, input.taxBps).cents;
  return { subtotalCents, serviceFeesCents, facilityFeesCents, discountCents, taxCents, totalCents: subtotalCents + serviceFeesCents + facilityFeesCents - discountCents + taxCents };
}
export function refundableCents(totalCents: number, refundedCents: number) {
  integer(totalCents, 'Total'); integer(refundedCents, 'Refunded');
  if (refundedCents > totalCents) throw new Error('Refund exceeds order');
  return totalCents - refundedCents;
}
