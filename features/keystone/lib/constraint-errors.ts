import { GraphQLError } from 'graphql'

type Rule = { code: string; message: string; fields?: string[] }
const AMOUNT = 'CONCERTS_INVALID_AMOUNT'
const CURRENCY = { code: 'CONCERTS_INVALID_CURRENCY', message: 'Currency must be a three-letter code, such as USD.' }
const TIME = 'CONCERTS_INVALID_TIME_RANGE'

/** Database rules (migrations/20261108130000_concerts_invariants) and what a person should read when one refuses a write. */
export const CONSTRAINT_MESSAGES: Record<string, Rule> = {
  PriceLevel_counts_valid: { code: 'CONCERTS_CAPACITY_EXCEEDED', message: 'Sold, held and blocked tickets can’t exceed a price level’s capacity.' },
  PriceLevel_amounts_valid: { code: AMOUNT, message: 'Ticket price and fees can’t be negative, and an order must allow at least one ticket.' },
  PriceLevel_sale_window: { code: TIME, message: 'Ticket sales must end after they start.' },
  PriceLevel_currency_code: CURRENCY,
  PriceLevelPhase_counts_valid: { code: 'CONCERTS_CAPACITY_EXCEEDED', message: 'A phase can’t sell more than its quantity, and quantities and prices can’t be negative.' },
  PriceLevelPhase_currency_code: CURRENCY,
  ProductionHold_quantity_positive: { code: 'CONCERTS_INVALID_QUANTITY', message: 'A production hold must cover at least one ticket.' },
  InventoryHold_quantity_positive: { code: 'CONCERTS_INVALID_QUANTITY', message: 'A hold must cover at least one ticket.' },
  ChartSection_capacity_non_negative: { code: 'CONCERTS_INVALID_CAPACITY', message: 'Capacity can’t be negative.' },
  Event_time_order: { code: TIME, message: 'Doors must open before the show, curfew must fall after it, and announce, presale and on-sale must be in that order.' },
  Tour_time_order: { code: TIME, message: 'A tour must end on or after its start date.' },
  PromoCode_window: { code: TIME, message: 'A promo must end after it starts.' },
  Venue_amounts_valid: { code: AMOUNT, message: 'Capacity and facility fees can’t be negative, and tax must be between 0% and 100%.' },
  Venue_currency_code: CURRENCY,
  Venue_timezone_valid: { code: 'CONCERTS_INVALID_TIMEZONE', message: 'That isn’t a recognised time zone (leave it blank to use UTC). Use a name such as America/Chicago.' },
  StoreSettings_amounts_valid: { code: AMOUNT, message: 'The refund approval threshold can’t be negative.' },
  StoreSettings_currency_code: CURRENCY,
  TicketOrder_amounts_balance: { code: AMOUNT, message: 'An order total must equal subtotal + fees + tax − discount, and a refund can’t exceed it.' },
  TicketOrder_currency_code: CURRENCY,
  TicketOrderLine_amounts_valid: { code: AMOUNT, message: 'Ticket quantities must be at least one and amounts can’t be negative.' },
  TicketOrderLine_currency_code: CURRENCY,
  Payment_amounts_valid: { code: AMOUNT, message: 'A payment must be positive, and refunds can’t exceed it.' },
  Payment_currency_code: CURRENCY,
  Refund_amount_positive: { code: AMOUNT, message: 'A refund must be a positive amount.' },
  Refund_currency_code: CURRENCY,
  Refund_within_payment: { code: 'CONCERTS_REFUND_EXCEEDS_PAYMENT', message: 'Refunds can’t exceed what was paid, and must be in the payment’s currency.' },
  PromoCode_value_valid: { code: AMOUNT, message: 'A promo value can’t be negative, and a percentage can’t pass 100%.' },
  PromoCode_uses_valid: { code: 'CONCERTS_PROMO_LIMIT', message: 'A promo can’t be used more times than its limit allows.' },
  PromoRedemption_amount_non_negative: { code: AMOUNT, message: 'A promo discount can’t be negative.' },
  CashDrawer_amounts_valid: { code: AMOUNT, message: 'Drawer amounts can’t be negative.' },
  CashDrawer_currency_code: CURRENCY,
  Offer_terms_valid: { code: 'CONCERTS_INVALID_TERMS', message: 'Deal amounts can’t be negative, and percentages and splits must be between 0% and 100%.' },
  Offer_currency_code: CURRENCY,
  EventExpense_amounts_valid: { code: AMOUNT, message: 'Expense amounts can’t be negative.' },
  EventExpense_currency_code: CURRENCY,
  MerchSales_amounts_valid: { code: AMOUNT, message: 'Merch amounts can’t be negative, and splits must be between 0% and 100%.' },
  MerchSales_currency_code: CURRENCY,
  BarSales_amounts_valid: { code: AMOUNT, message: 'Bar sales can’t be negative, and the promoter share must be between 0% and 100%.' },
  BarSales_currency_code: CURRENCY,
  Settlement_amounts_valid: { code: AMOUNT, message: 'Settlement amounts and the balance due can’t be negative.' },
  Settlement_currency_code: CURRENCY,
  SettlementLine_currency_code: CURRENCY,
  ArtistPayment_amount_positive: { code: AMOUNT, message: 'An artist payment must be a positive amount.' },
  ArtistPayment_currency_code: CURRENCY,
  Settlement_event_version_key: { code: 'CONCERTS_DUPLICATE_SETTLEMENT_VERSION', message: 'That settlement version already exists. Reload and try again.', fields: ['event', 'version'] },
  Offer_event_artist_version_key: { code: 'CONCERTS_DUPLICATE_OFFER_VERSION', message: 'That offer version already exists. Reload and try again.', fields: ['artist', 'event', 'version'] },
  Offer_one_draft_per_event_artist: { code: 'CONCERTS_DUPLICATE_DRAFT', message: 'This artist already has a draft offer for this event.', fields: ['artist', 'event'] },
  EventArtist_event_artist_key: { code: 'CONCERTS_DUPLICATE_BILLING', message: 'That artist is already on this bill.', fields: ['artist', 'event'] },
  EventArtist_event_position_key: { code: 'CONCERTS_DUPLICATE_BILLING', message: 'Another act already holds that place on the bill. Reload and try again.', fields: ['event', 'position'] },
  MerchSales_event_key: { code: 'CONCERTS_DUPLICATE_SALES_SHEET', message: 'Merch sales are already recorded for this event.', fields: ['event'] },
  BarSales_event_key: { code: 'CONCERTS_DUPLICATE_SALES_SHEET', message: 'Bar sales are already recorded for this event.', fields: ['event'] },
  ScanEvent_one_admission_per_ticket: { code: 'CONCERTS_DUPLICATE_ADMISSION', message: 'That ticket has already been admitted.', fields: ['ticket'] },
  Seat_chartSection_row_number_key: { code: 'CONCERTS_DUPLICATE_SEAT', message: 'That seat already exists in this section.', fields: ['chartSection', 'row', 'number'] },
  Agency_name_key: { code: 'CONCERTS_DUPLICATE_NAME', message: 'An agency with that name already exists.', fields: ['name'] },
  Venue_name_city_key: { code: 'CONCERTS_DUPLICATE_NAME', message: 'A venue with that name already exists in that city.', fields: ['city', 'name'] },
}

type ErrorLink = {
  message?: unknown; meta?: { target?: unknown }; code?: unknown; originalError?: unknown; cause?: unknown
  // Keystone returns uncoded Prisma failures (CHECK and trigger violations) as "Prisma error" with the text here.
  extensions?: { debug?: { message?: unknown }; prisma?: { meta?: unknown } }
} | null | undefined

function chain(error: unknown) {
  const out: ErrorLink[] = []
  let current = error as ErrorLink
  for (let depth = 0; current && depth < 6; depth++) { out.push(current); current = (current.originalError ?? current.cause) as ErrorLink }
  return out
}

/** The readable, coded refusal for a known constraint violation anywhere in the error's cause chain, or null. */
export function constraintRefusal(error: unknown): { code: string; message: string } | null {
  for (const link of chain(error)) {
    const text = [
      link?.message, typeof link?.meta === 'object' ? JSON.stringify(link.meta) : '',
      link?.extensions?.debug?.message ?? '', link?.extensions?.prisma?.meta ? JSON.stringify(link.extensions.prisma.meta) : '',
    ].join(' ')
    for (const [name, rule] of Object.entries(CONSTRAINT_MESSAGES)) if (text.includes(name)) return rule
    // Prisma sometimes reports a unique violation by its fields instead of the index name.
    const listed = /Unique constraint failed on the fields: \((.*?)\)(?:\s|$)/.exec(String(link?.message || ''))?.[1]?.match(/`([^`]+)`/g)?.map(field => field.slice(1, -1))
    // Raw SQL writes surface Postgres's own detail instead: Key (event, artist)=(…) already exists.
    const keyed = /Key \((.*?)\)=\(.*\) already exists/.exec(text)?.[1]?.split(',').map(field => field.trim().replace(/^"|"$/g, ''))
    const unwrap = (field: unknown) => String(field).replace(/^lower\((.*)\)$/, '$1')
    const fields = (link?.code === 'P2002' && Array.isArray(link?.meta?.target) ? link.meta.target : listed ?? keyed)?.map(unwrap)
    if (fields?.length) {
      const target = [...fields].map(String).sort().join(',')
      const matches = Object.values(CONSTRAINT_MESSAGES).filter(rule => rule.fields && [...rule.fields].sort().join(',') === target)
      if (matches.length === 1) return matches[0]
      // Prisma names fields, not the index: when two rules share a field list, do not guess which one refused.
      if (matches.length > 1) return { code: 'CONCERTS_DUPLICATE_RECORD', message: 'That record already exists. Reload and check before adding it again.' }
    }
  }
  return null
}

export function constraintGraphQLError(error: GraphQLError, refusal: { code: string; message: string }): GraphQLError {
  return new GraphQLError(refusal.message, { nodes: error.nodes, source: error.source, positions: error.positions, path: error.path, extensions: { code: refusal.code } })
}
