-- Rules the app already relied on, now enforced by the database. Live data was checked read-only first: 0 violations.

-- Capacity: sold + held + production-held never pass a price level's capacity; phases never sell past their quantity.
ALTER TABLE "PriceLevel"
  ADD CONSTRAINT "PriceLevel_counts_valid" CHECK ("sold" >= 0 AND "held" >= 0 AND "productionHeld" >= 0 AND "capacity" >= 0 AND "sold" + "held" + "productionHeld" <= "capacity"),
  ADD CONSTRAINT "PriceLevel_amounts_valid" CHECK ("priceCents" >= 0 AND "feeCents" >= 0 AND "facilityFeeCents" >= 0 AND "perOrderLimit" >= 1),
  ADD CONSTRAINT "PriceLevel_sale_window" CHECK ("salesStartAt" IS NULL OR "salesEndAt" IS NULL OR "salesStartAt" < "salesEndAt"),
  ADD CONSTRAINT "PriceLevel_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "PriceLevelPhase"
  ADD CONSTRAINT "PriceLevelPhase_counts_valid" CHECK ("quantity" >= 0 AND "sold" >= 0 AND "sold" <= "quantity" AND "priceCents" >= 0),
  ADD CONSTRAINT "PriceLevelPhase_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ProductionHold" ADD CONSTRAINT "ProductionHold_quantity_positive" CHECK ("quantity" >= 1);
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_quantity_positive" CHECK ("quantity" >= 1);
ALTER TABLE "ChartSection" ADD CONSTRAINT "ChartSection_capacity_non_negative" CHECK ("capacity" >= 0);

-- Time
ALTER TABLE "Event" ADD CONSTRAINT "Event_time_order" CHECK (
  ("doorsAt" IS NULL OR "showAt" IS NULL OR "doorsAt" <= "showAt")
  AND ("curfewAt" IS NULL OR "showAt" IS NULL OR "curfewAt" > "showAt")
  AND ("announceAt" IS NULL OR "onSaleAt" IS NULL OR "announceAt" <= "onSaleAt")
  AND ("presaleAt" IS NULL OR "onSaleAt" IS NULL OR "presaleAt" <= "onSaleAt"));
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_time_order" CHECK ("startAt" IS NULL OR "endAt" IS NULL OR "endAt" >= "startAt");
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_window" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" < "endsAt");

-- Venue and settings
ALTER TABLE "Venue"
  ADD CONSTRAINT "Venue_amounts_valid" CHECK ("capacity" >= 0 AND "defaultFacilityFeeCents" >= 0 AND "taxBps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "Venue_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "StoreSettings"
  ADD CONSTRAINT "StoreSettings_amounts_valid" CHECK ("refundApprovalThresholdCents" >= 0),
  ADD CONSTRAINT "StoreSettings_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');

CREATE FUNCTION concerts_venue_timezone_valid() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."timezone" IS NULL OR NEW."timezone" = '' THEN RETURN NEW; END IF;
  BEGIN
    PERFORM now() AT TIME ZONE NEW."timezone";
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Venue_timezone_valid: % is not a time zone', NEW."timezone" USING ERRCODE = '23514';
  END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Venue_timezone_valid" BEFORE INSERT OR UPDATE OF "timezone" ON "Venue"
  FOR EACH ROW EXECUTE FUNCTION concerts_venue_timezone_valid();

-- Money
ALTER TABLE "TicketOrder"
  ADD CONSTRAINT "TicketOrder_amounts_balance" CHECK ("subtotalCents" >= 0 AND "serviceFeesCents" >= 0 AND "facilityFeesCents" >= 0 AND "taxCents" >= 0 AND "discountCents" >= 0 AND "refundedCents" >= 0 AND "refundedCents" <= "totalCents" AND "totalCents" = "subtotalCents" + "serviceFeesCents" + "facilityFeesCents" + "taxCents" - "discountCents"),
  ADD CONSTRAINT "TicketOrder_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "TicketOrderLine"
  ADD CONSTRAINT "TicketOrderLine_amounts_valid" CHECK ("quantity" >= 1 AND "unitPriceCents" >= 0 AND "serviceFeeCents" >= 0 AND "facilityFeeCents" >= 0 AND "taxCents" >= 0 AND "discountCents" >= 0 AND "totalCents" >= 0),
  ADD CONSTRAINT "TicketOrderLine_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amounts_valid" CHECK ("amount" > 0 AND "refundedAmount" >= 0 AND "refundedAmount" <= "amount"),
  ADD CONSTRAINT "Payment_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "Refund_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "PromoCode"
  ADD CONSTRAINT "PromoCode_value_valid" CHECK ("value" >= 0 AND ("discountType" <> 'percent_bps' OR "value" <= 10000) AND "perOrderLimit" >= 0),
  ADD CONSTRAINT "PromoCode_uses_valid" CHECK ("maxUses" >= 0 AND "usedCount" >= 0 AND "usedCount" <= "maxUses");
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_amount_non_negative" CHECK ("amountCents" >= 0);
ALTER TABLE "CashDrawer"
  ADD CONSTRAINT "CashDrawer_amounts_valid" CHECK ("openingFloatCents" >= 0 AND "cashSalesCents" >= 0 AND "cashRefundsCents" >= 0),
  ADD CONSTRAINT "CashDrawer_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');

-- Artist deals and settlement
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_terms_valid" CHECK ("version" >= 1 AND "guaranteeCents" >= 0 AND "expenseCapCents" >= 0 AND "depositCents" >= 0 AND "hospitalityRiderCents" >= 0
    AND "percentageBps" BETWEEN 0 AND 10000 AND "promoterProfitBps" BETWEEN 0 AND 10000 AND "merchSplitBps" BETWEEN 0 AND 10000 AND "hardMerchSplitBps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "Offer_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "EventExpense"
  ADD CONSTRAINT "EventExpense_amounts_valid" CHECK ("budgetCents" >= 0 AND "actualCents" >= 0),
  ADD CONSTRAINT "EventExpense_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "MerchSales"
  ADD CONSTRAINT "MerchSales_amounts_valid" CHECK ("softGrossCents" >= 0 AND "hardGrossCents" >= 0 AND "venueShareCents" >= 0 AND "sellerFeeCents" >= 0 AND "venueSoftSplitBps" BETWEEN 0 AND 10000 AND "venueHardSplitBps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "MerchSales_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "BarSales"
  ADD CONSTRAINT "BarSales_amounts_valid" CHECK ("grossCents" >= 0 AND "promoterShareBps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "BarSales_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_amounts_valid" CHECK ("version" >= 0 AND "ticketGrossCents" >= 0 AND "balanceDueArtistCents" >= 0 AND "depositsPaidCents" >= 0),
  ADD CONSTRAINT "Settlement_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "SettlementLine" ADD CONSTRAINT "SettlementLine_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ArtistPayment"
  ADD CONSTRAINT "ArtistPayment_amount_positive" CHECK ("amountCents" >= 1),
  ADD CONSTRAINT "ArtistPayment_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');

-- Refunds never exceed the payment, in the payment's currency. The payment row is locked so two concurrent refunds
-- are counted one after the other. Prisma drops the constraint name from trigger errors, so the rule name leads the message.
CREATE FUNCTION concerts_refund_within_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  paid RECORD;
  refunded BIGINT;
BEGIN
  IF NEW."payment" IS NULL THEN RETURN NULL; END IF;
  SELECT "amount", "currencyCode" INTO paid FROM "Payment" WHERE "id" = NEW."payment" FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NEW."currencyCode" <> paid."currencyCode" THEN
    RAISE EXCEPTION 'Refund_within_payment: refund currency % differs from payment currency %', NEW."currencyCode", paid."currencyCode" USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(SUM("amount"), 0) INTO refunded FROM "Refund"
    WHERE "payment" = NEW."payment" AND "status" IN ('processing', 'unknown', 'succeeded');
  IF refunded > paid."amount" THEN
    RAISE EXCEPTION 'Refund_within_payment: refunds % exceed payment %', refunded, paid."amount" USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "Refund_within_payment"
  AFTER INSERT OR UPDATE OF "amount", "status", "payment", "currencyCode" ON "Refund"
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION concerts_refund_within_payment();

-- Uniqueness. Plain unique indexes are written as partial ones (WHERE parent IS NOT NULL) so Prisma, which cannot express them, leaves them alone.
CREATE UNIQUE INDEX "Settlement_event_version_key" ON "Settlement"("event", "version") WHERE "event" IS NOT NULL;
CREATE UNIQUE INDEX "Offer_event_artist_version_key" ON "Offer"("event", "artist", "version") WHERE "event" IS NOT NULL AND "artist" IS NOT NULL;
CREATE UNIQUE INDEX "Offer_one_draft_per_event_artist" ON "Offer"("event", "artist") WHERE "status" = 'draft';
CREATE UNIQUE INDEX "EventArtist_event_artist_key" ON "EventArtist"("event", "artist") WHERE "event" IS NOT NULL AND "artist" IS NOT NULL;
CREATE UNIQUE INDEX "EventArtist_event_position_key" ON "EventArtist"("event", "position") WHERE "event" IS NOT NULL;
CREATE UNIQUE INDEX "MerchSales_event_key" ON "MerchSales"("event") WHERE "event" IS NOT NULL;
CREATE UNIQUE INDEX "BarSales_event_key" ON "BarSales"("event") WHERE "event" IS NOT NULL;
CREATE UNIQUE INDEX "ScanEvent_one_admission_per_ticket" ON "ScanEvent"("ticket") WHERE "result" = 'admitted';
CREATE UNIQUE INDEX "Seat_chartSection_row_number_key" ON "Seat"("chartSection", "row", "number") WHERE "chartSection" IS NOT NULL;
-- Expression indexes (case-insensitive): Prisma ignores them, so a generated migration will not drop them.
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"(lower("name"));
CREATE UNIQUE INDEX "Venue_name_city_key" ON "Venue"(lower("name"), lower("city"));
