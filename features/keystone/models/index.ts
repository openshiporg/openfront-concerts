import { User } from './User';
import { Role } from './Role';
import { OAuthApp } from './OAuthApp';
import { OAuthToken } from './OAuthToken';
import { Venue } from './Venue';
import { SeatingChart } from './SeatingChart';
import { ChartSection } from './ChartSection';
import { Seat } from './Seat';
import { Agency } from './Agency';
import { Artist } from './Artist';
import { Tour } from './Tour';
import { Event } from './Event';
import { EventArtist } from './EventArtist';
import { DateHold } from './DateHold';
import { Offer } from './Offer';
import { EventExpense } from './EventExpense';
import { PriceLevel } from './PriceLevel';
import { PriceLevelPhase } from './PriceLevelPhase';
import { SeatInventory } from './SeatInventory';
import { ProductionHold } from './ProductionHold';
import { InventoryHold } from './InventoryHold';
import { PromoCode } from './PromoCode';
import { PromoRedemption } from './PromoRedemption';
import { TicketOrder } from './TicketOrder';
import { TicketOrderLine } from './TicketOrderLine';
import { Ticket } from './Ticket';
import { ScanEvent } from './ScanEvent';
import { MerchSales } from './MerchSales';
import { BarSales } from './BarSales';
import { Settlement } from './Settlement';
import { SettlementLine } from './SettlementLine';
import { ArtistPayment } from './ArtistPayment';
import { AuditEvent } from './AuditEvent';
import { StoreSettings } from './StoreSettings';
import { PaymentProvider } from './PaymentProvider';
import { PaymentCollection } from './PaymentCollection';
import { PaymentSession } from './PaymentSession';
import { Payment } from './Payment';
import { Refund } from './Refund';
import { PaymentWebhookEvent } from './PaymentWebhookEvent';
import { IdempotencyKey } from './IdempotencyKey';
import { ManagerApproval } from './ManagerApproval';
import { CashDrawer } from './CashDrawer';
import { filterFollowsRead } from '../filter-access';
const baseModels = { User, Role, OAuthApp, OAuthToken, Venue, SeatingChart, ChartSection, Seat, Agency, Artist, Tour, Event, EventArtist, DateHold, Offer, EventExpense, PriceLevel, PriceLevelPhase, SeatInventory, ProductionHold, InventoryHold, PromoCode, PromoRedemption, TicketOrder, TicketOrderLine, Ticket, ScanEvent, MerchSales, BarSales, Settlement, SettlementLine, ArtistPayment, AuditEvent, StoreSettings, PaymentProvider, PaymentCollection, PaymentSession, Payment, Refund, PaymentWebhookEvent, IdempotencyKey, ManagerApproval, CashDrawer };
const allModels = filterFollowsRead(baseModels as any) as typeof baseModels;
// Narrow the sidebar and create links per role from each list's own operation access.
type Gate = (args: { session?: unknown }) => unknown;
const narrowed = (config: any) => {
  const operation = config.access?.operation ?? {};
  const ui = config.ui ?? {};
  const allowed = (gate: Gate | undefined, args: { session?: unknown }) => typeof gate !== 'function' || Boolean(gate(args));
  return {
    ...config,
    ui: {
      ...ui,
      isHidden: ui.isHidden ?? ((args: { session?: unknown }) => !allowed(operation.query, args)),
      hideCreate: ui.hideCreate ?? ((args: { session?: unknown }) => !allowed(operation.create, args)),
    },
  };
};
export const models = Object.fromEntries(Object.entries(allModels).map(([key, config]) => [key, narrowed(config)])) as typeof allModels;
export default models;
