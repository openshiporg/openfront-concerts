![openfront-concerts](.github/logo.svg)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenshiporg%2Fopenfront-concerts&env=DATABASE_URL%2CSESSION_SECRET)

Openfront Concerts is a self-hostable ticketing, artist-deal and settlement application for an independent promoter that runs its own venues and promotes at partner venues. Built on Next.js 16 and Keystone 6.

**Documentation:** [docs.openship.org/docs/openfront/concerts](https://docs.openship.org/docs/openfront/concerts)

## Live

Lantern Live

| | |
|---|---|
| **Storefront** | [concerts.openship.org](https://concerts.openship.org) |
| **Dashboard** | [concerts.openship.org/dashboard](https://concerts.openship.org/dashboard) |

[Learn more →](https://openship.org/products/openfront-concerts)

[Documentation →](https://docs.openship.org/docs/openfront/concerts/)

## What is built

### Data model (41 lists)
- **Venues and seating:** Venue, SeatingChart (draft, published, retired; a published chart is immutable), ChartSection (general admission or reserved), Seat (sellable or killed).
- **Talent and deals:** Agency, Artist, Tour, Event, EventArtist (billing), DateHold (ranked calendar holds), Offer (flat guarantee, versus, plus, door deal) with accepted terms frozen by hash, EventExpense.
- **Pricing and inventory:** PriceLevel, PriceLevelPhase (tiered pricing), SeatInventory (one live hold or sale per seat through a unique occupancy key), ProductionHold, InventoryHold (10-minute customer hold), PromoCode and PromoRedemption (reserved, committed or released).
- **Orders and admission:** TicketOrder, TicketOrderLine (price, fee and tax snapshot), Ticket (code plus a stored SHA-256 token hash), ScanEvent.
- **Settlement:** MerchSales, BarSales, Settlement (hashed computed snapshot, versions), SettlementLine, ArtistPayment.
- **Platform:** AuditEvent (append-only), IdempotencyKey, StoreSettings, the payment lineage from Openfront Restaurant (PaymentProvider, PaymentCollection, PaymentSession, Payment, Refund, PaymentWebhookEvent), plus User, Role and the MCP OAuth lists.

### Rules the server enforces
- Capacity and holds run under a per-event advisory lock inside one database transaction; counters are recounted under the lock.
- Money is integer cents with basis-point percentages. Settlement math is a pure function in `features/keystone/lib/settlement.ts` with unit tests (`node --import tsx --test features/keystone/lib/settlement.test.ts`).
- Every status change goes through a custom mutation that compares the current state, writes an audit event and takes an idempotency key. Raw status fields are not updatable.
- Refunds above the settings threshold need approval from a different user holding `canApproveAdjustments`.
- A transfer voids the old token and issues a new one in the same transaction.

### Platform (operator dashboard)
Events (status tabs; overview, billing, pricing, seating map, orders, expenses, settlement), Calendar and holds, Deals (with a calculator preview), Box office, Door scan, Settlements (worksheet, sign-off), Venues and seating charts, Artists and tours, Orders, Promo codes, Customers, Payment providers, Settings. Onboarding runs from the sidebar card with a full or minimal template.

### Storefront
Plain, unstyled pages: upcoming events, event page (general admission quantity or seat grid), hold with timer, Stripe payment, confirmation with order code and ticket codes, order lookup by email and order number, ticket transfer. The storefront uses only the custom GraphQL operations (`eventsOnSale`, `eventAvailability`, `createGaHold`, `createSeatHold`, `startTicketCheckout`, `completeTicketCheckout`, `lookupTicketOrder`, `transferTicket`) with a signed, expiring proof for guests.

### Operator GraphQL
`placeDateHold`, `challengeHold`, `confirmHold`, `sendOffer`, `acceptOffer`, `publishEvent`, `setProductionHold`, `releaseProductionHold`, `scanTicket`, `recordMerchSales`, `computeSettlement`, `adjustSettlement`, `signSettlement`, `recordArtistPayment`, `postponeEvent`, `cancelEvent`, `refundTicketOrder`.

### MCP
`/api/mcp-transport/mcp` serves the schema-driven tools with OAuth bearer sessions. Scopes only narrow what the signed-in user can already do.

## Not included
Dynamic pricing, resale, wallet passes, accounting export and multi-tenant promoters.

## Getting started

```bash
# .env needs DATABASE_URL (PostgreSQL) and SESSION_SECRET (48+ characters)
npm install
npm run dev
```

Open `/dashboard/init` to create the first admin, then run setup from the sidebar. Payments use Stripe; set `NEXT_PUBLIC_STRIPE_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (test keys for development) and point the Stripe webhook at `/api/integrations/payment/pp_stripe_stripe/webhook`.

## The Openfront Ecosystem

Every Openfront is open source and self-hostable. Try any of them live.

| Product | For | Repository | Live | Docs |
|---|---|---|---|---|
| Openfront E-commerce | Online store: catalog, checkout, orders, fulfillment | [openfront](https://github.com/openshiporg/openfront) | [e-commerce.openship.org](https://e-commerce.openship.org) | [Docs](https://docs.openship.org/docs/openfront/ecommerce) |
| Openfront Restaurant | Online ordering, POS and kitchen display | [openfront-restaurant](https://github.com/openshiporg/openfront-restaurant) | [restaurant.openship.org](https://restaurant.openship.org) | [Docs](https://docs.openship.org/docs/openfront/restaurant) |
| Openfront Grocery | Grocery ordering, lots, expiry and pickup | [openfront-grocery](https://github.com/openshiporg/openfront-grocery) | [grocery.openship.org](https://grocery.openship.org) | [Docs](https://docs.openship.org/docs/openfront/grocery) |
| Openfront Gym | Memberships, classes, check-in and billing | [openfront-gym](https://github.com/openshiporg/openfront-gym) | [gym.openship.org](https://gym.openship.org) | [Docs](https://docs.openship.org/docs/openfront/gym) |
| Openfront Hotel | Reservations, front desk, housekeeping, folios | [openfront-hotel](https://github.com/openshiporg/openfront-hotel) | [hotel.openship.org](https://hotel.openship.org) | [Docs](https://docs.openship.org/docs/openfront/hotel) |
| Openfront Rental | Short-term rental bookings and calendars | [openfront-rental](https://github.com/openshiporg/openfront-rental) | [rental.openship.org](https://rental.openship.org) | [Docs](https://docs.openship.org/docs/openfront/rental) |
| Openfront Salon | Appointments, stylists and services | [openfront-salon](https://github.com/openshiporg/openfront-salon) | [salon.openship.org](https://salon.openship.org) | [Docs](https://docs.openship.org/docs/openfront/salon) |
| Openfront Barbershop | Bookings, walk-ins and barbers | [openfront-barbershop](https://github.com/openshiporg/openfront-barbershop) | [barbershop.openship.org](https://barbershop.openship.org) | [Docs](https://docs.openship.org/docs/openfront/barbershop) |
| Openfront Coffee Shop | Café ordering and counter POS | [openfront-coffeeshop](https://github.com/openshiporg/openfront-coffeeshop) | [coffee-shop.openship.org](https://coffee-shop.openship.org) | [Docs](https://docs.openship.org/docs/openfront/coffee-shop) |
| Openfront Real Estate | Listings, showings and transactions | [openfront-realestate](https://github.com/openshiporg/openfront-realestate) | [real-estate.openship.org](https://real-estate.openship.org) | [Docs](https://docs.openship.org/docs/openfront/real-estate) |
| Openfront Dealership | Inventory, test drives, deals and service | [openfront-dealership](https://github.com/openshiporg/openfront-dealership) | [dealership.openship.org](https://dealership.openship.org) | [Docs](https://docs.openship.org/docs/openfront/dealership) |
| Openfront Vape | Age-gated retail with compliance controls | [openfront-vape](https://github.com/openshiporg/openfront-vape) | [vape.openship.org](https://vape.openship.org) | [Docs](https://docs.openship.org/docs/openfront/vape) |
| Openfront Convenience | Convenience store POS and inventory | [openfront-convenience](https://github.com/openshiporg/openfront-convenience) | [convenience.openship.org](https://convenience.openship.org) | [Docs](https://docs.openship.org/docs/openfront/convenience) |
| Openfront Collectibles | Graded items, consignment and provenance | [openfront-collectibles](https://github.com/openshiporg/openfront-collectibles) | [collectibles.openship.org](https://collectibles.openship.org) | [Docs](https://docs.openship.org/docs/openfront/collectibles) |
| Openfront Cannabis | Dispensary menu, packages and recalls | [openfront-cannabis](https://github.com/openshiporg/openfront-cannabis) | [cannabis.openship.org](https://cannabis.openship.org) | [Docs](https://docs.openship.org/docs/openfront/cannabis) |
| Openfront Pharmacy | Prescriptions, inventory lots and pickup | [openfront-pharmacy](https://github.com/openshiporg/openfront-pharmacy) | [pharmacy.openship.org](https://pharmacy.openship.org) | [Docs](https://docs.openship.org/docs/openfront/pharmacy) |
| Openfront Med Spa | Treatments, consents and memberships | [openfront-medspa](https://github.com/openshiporg/openfront-medspa) | [medspa.openship.org](https://medspa.openship.org) | [Docs](https://docs.openship.org/docs/openfront/medspa) |
| Openfront Construction | Projects, bids, change orders and crews | [openfront-construction](https://github.com/openshiporg/openfront-construction) | [construction.openship.org](https://construction.openship.org) | [Docs](https://docs.openship.org/docs/openfront/construction) |
| Openfront Law Firm | Matters, intake, time and billing | [openfront-law-firm](https://github.com/openshiporg/openfront-law-firm) | [law-firm.openship.org](https://law-firm.openship.org) | [Docs](https://docs.openship.org/docs/openfront/law-firm) |
| **Openfront Concerts** (this repository) | Ticketing, artist deals and post-show settlement for promoters | [openfront-concerts](https://github.com/openshiporg/openfront-concerts) | [concerts.openship.org](https://concerts.openship.org) | [Docs](https://docs.openship.org/docs/openfront/concerts) |
| Openfront Rideshare | Rides, drivers and dispatch | [openfront-rideshare](https://github.com/openshiporg/openfront-rideshare) | [rideshare.openship.org](https://rideshare.openship.org) | [Docs](https://docs.openship.org/docs/openfront/rideshare) |
| Openfront Airline | Flights, booking and passenger operations | [openfront-airline](https://github.com/openshiporg/openfront-airline) | [airline.openship.org](https://airline.openship.org) | [Docs](https://docs.openship.org/docs/openfront/airline) |
| Openfront Hospital | Appointments, patients and care teams | [openfront-hospital](https://github.com/openshiporg/openfront-hospital) | [hospital.openship.org](https://hospital.openship.org) | [Docs](https://docs.openship.org/docs/openfront/hospital) |
| Openfront Sportsbook | Markets, bets and results | [openfront-sportsbook](https://github.com/openshiporg/openfront-sportsbook) | [sportsbook.openship.org](https://sportsbook.openship.org) | [Docs](https://docs.openship.org/docs/openfront/sportsbook) |
| Openship | Order routing from sales channels to fulfillment | [openship](https://github.com/openshiporg/openship) | [os.openship.org](https://os.openship.org) | [Docs](https://docs.openship.org/docs/openship/ecommerce) |
| Marketplace | Shop across Openfront stores | [marketplace](https://github.com/openshiporg/marketplace) | [marketplace.openship.org](https://marketplace.openship.org) | [Docs](https://docs.openship.org/docs/openfront/marketplace) |
