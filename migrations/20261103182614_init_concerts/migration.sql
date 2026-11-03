-- CreateEnum
CREATE TYPE "PaymentCollectionDescriptionType" AS ENUM ('default', 'refund');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "role" TEXT,
    "onboardingStatus" TEXT DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passwordResetToken" TEXT,
    "passwordResetIssuedAt" TIMESTAMP(3),
    "passwordResetRedeemedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "canSeeOtherPeople" BOOLEAN NOT NULL DEFAULT false,
    "canEditOtherPeople" BOOLEAN NOT NULL DEFAULT false,
    "canManagePeople" BOOLEAN NOT NULL DEFAULT false,
    "canManageRoles" BOOLEAN NOT NULL DEFAULT false,
    "canAccessDashboard" BOOLEAN NOT NULL DEFAULT false,
    "canManageOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "canManagePayments" BOOLEAN NOT NULL DEFAULT false,
    "canReadPayments" BOOLEAN NOT NULL DEFAULT false,
    "canIssueRefunds" BOOLEAN NOT NULL DEFAULT false,
    "canReadAudit" BOOLEAN NOT NULL DEFAULT false,
    "canManageEvents" BOOLEAN NOT NULL DEFAULT false,
    "canManageDeals" BOOLEAN NOT NULL DEFAULT false,
    "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
    "canManageOrders" BOOLEAN NOT NULL DEFAULT false,
    "canScanTickets" BOOLEAN NOT NULL DEFAULT false,
    "canManageSettlements" BOOLEAN NOT NULL DEFAULT false,
    "canApproveAdjustments" BOOLEAN NOT NULL DEFAULT false,
    "canManageVenues" BOOLEAN NOT NULL DEFAULT false,
    "canManageArtists" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL DEFAULT '',
    "clientSecret" TEXT NOT NULL DEFAULT '',
    "tokenEndpointAuthMethod" TEXT DEFAULT 'client_secret_post',
    "redirectUris" JSONB DEFAULT '[]',
    "scopes" JSONB DEFAULT '["mcp:read","mcp:write"]',
    "webhookUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'active',
    "installUrl" TEXT NOT NULL DEFAULT '',
    "uninstallUrl" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB DEFAULT '{}',
    "developerEmail" TEXT NOT NULL DEFAULT '',
    "privacyPolicyUrl" TEXT NOT NULL DEFAULT '',
    "termsOfServiceUrl" TEXT NOT NULL DEFAULT '',
    "supportUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL DEFAULT '',
    "user" TEXT,
    "scopes" JSONB DEFAULT '[]',
    "redirectUri" TEXT NOT NULL DEFAULT '',
    "resource" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "isRevoked" TEXT DEFAULT 'false',
    "authorizationCode" TEXT NOT NULL DEFAULT '',
    "refreshToken" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "codeChallenge" TEXT NOT NULL DEFAULT '',
    "codeChallengeMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER DEFAULT 0,
    "defaultFacilityFeeCents" INTEGER DEFAULT 0,
    "taxBps" INTEGER DEFAULT 0,
    "ownedByPromoter" BOOLEAN NOT NULL DEFAULT false,
    "rentTermsDefault" JSONB,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatingChart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "version" INTEGER DEFAULT 1,
    "status" TEXT DEFAULT 'draft',
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatingChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER DEFAULT 0,
    "sort" INTEGER DEFAULT 0,
    "kind" TEXT DEFAULT 'ga',
    "chart" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "row" TEXT NOT NULL DEFAULT '',
    "number" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "x" INTEGER DEFAULT 0,
    "y" INTEGER DEFAULT 0,
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "companion" BOOLEAN NOT NULL DEFAULT false,
    "obstructed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT DEFAULT 'sellable',
    "chartSection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "contacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "genreTags" TEXT NOT NULL DEFAULT '',
    "agentName" TEXT NOT NULL DEFAULT '',
    "agentEmail" TEXT NOT NULL DEFAULT '',
    "manager" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "socials" JSONB,
    "agency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "artist" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "presaleCode" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isCoPro" BOOLEAN NOT NULL DEFAULT false,
    "allowReentry" BOOLEAN NOT NULL DEFAULT false,
    "doorsAt" TIMESTAMP(3),
    "showAt" TIMESTAMP(3),
    "curfewAt" TIMESTAMP(3),
    "announceAt" TIMESTAMP(3),
    "onSaleAt" TIMESTAMP(3),
    "presaleAt" TIMESTAMP(3),
    "refundWindowEndsAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'hold',
    "ageRestriction" TEXT DEFAULT 'all_ages',
    "venue" TEXT,
    "seatingChart" TEXT,
    "tour" TEXT,
    "promoter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventArtist" (
    "id" TEXT NOT NULL,
    "position" INTEGER DEFAULT 0,
    "setMinutes" INTEGER DEFAULT 0,
    "setTime" TIMESTAMP(3),
    "billing" TEXT DEFAULT 'headliner',
    "event" TEXT,
    "artist" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateHold" (
    "id" TEXT NOT NULL,
    "rankKey" TEXT,
    "rank" INTEGER DEFAULT 0,
    "date" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'held',
    "venue" TEXT,
    "artist" TEXT,
    "agency" TEXT,
    "event" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "breakevenBasis" TEXT NOT NULL DEFAULT '',
    "radiusClause" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "acceptedTermsHash" TEXT NOT NULL DEFAULT '',
    "version" INTEGER DEFAULT 1,
    "guaranteeCents" INTEGER DEFAULT 0,
    "percentageBps" INTEGER DEFAULT 0,
    "promoterProfitBps" INTEGER DEFAULT 0,
    "expenseCapCents" INTEGER DEFAULT 0,
    "merchSplitBps" INTEGER DEFAULT 0,
    "hardMerchSplitBps" INTEGER DEFAULT 0,
    "hospitalityRiderCents" INTEGER DEFAULT 0,
    "depositCents" INTEGER DEFAULT 0,
    "acceptedTerms" JSONB,
    "depositDueAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'draft',
    "dealType" TEXT DEFAULT 'flat_guarantee',
    "event" TEXT,
    "artist" TEXT,
    "eventArtist" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventExpense" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL DEFAULT '',
    "receipt" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "budgetCents" INTEGER DEFAULT 0,
    "actualCents" INTEGER DEFAULT 0,
    "isCapped" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT DEFAULT 'venue_rent',
    "event" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER DEFAULT 0,
    "feeCents" INTEGER DEFAULT 0,
    "facilityFeeCents" INTEGER DEFAULT 0,
    "capacity" INTEGER DEFAULT 0,
    "sold" INTEGER DEFAULT 0,
    "held" INTEGER DEFAULT 0,
    "perOrderLimit" INTEGER DEFAULT 8,
    "productionHeld" INTEGER DEFAULT 0,
    "salesStartAt" TIMESTAMP(3),
    "salesEndAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "event" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceLevelPhase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER DEFAULT 0,
    "quantity" INTEGER DEFAULT 0,
    "sold" INTEGER DEFAULT 0,
    "sort" INTEGER DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "priceLevel" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceLevelPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatInventory" (
    "id" TEXT NOT NULL,
    "holdKey" TEXT,
    "occupancyKey" TEXT,
    "eventSeatKey" TEXT,
    "status" TEXT DEFAULT 'open',
    "event" TEXT,
    "seat" TEXT,
    "priceLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionHold" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 0,
    "releaseAt" TIMESTAMP(3),
    "holdType" TEXT DEFAULT 'artist',
    "status" TEXT DEFAULT 'active',
    "event" TEXT,
    "priceLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryHold" (
    "id" TEXT NOT NULL,
    "holdKey" TEXT,
    "secretHash" TEXT NOT NULL DEFAULT '',
    "presaleCode" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER DEFAULT 0,
    "quoteSnapshot" JSONB,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "event" TEXT,
    "priceLevel" TEXT,
    "phase" TEXT,
    "customer" TEXT,
    "order" TEXT,
    "promoCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "discountType" TEXT DEFAULT 'percent_bps',
    "value" INTEGER DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER DEFAULT 0,
    "perOrderLimit" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "event" TEXT,
    "tour" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCode" TEXT,
    "hold" TEXT,
    "order" TEXT,
    "amountCents" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT,
    "guestEmail" TEXT NOT NULL DEFAULT '',
    "guestName" TEXT NOT NULL DEFAULT '',
    "secretKey" TEXT NOT NULL DEFAULT '',
    "subtotalCents" INTEGER DEFAULT 0,
    "serviceFeesCents" INTEGER DEFAULT 0,
    "facilityFeesCents" INTEGER DEFAULT 0,
    "taxCents" INTEGER DEFAULT 0,
    "discountCents" INTEGER DEFAULT 0,
    "totalCents" INTEGER DEFAULT 0,
    "refundedCents" INTEGER DEFAULT 0,
    "ageAttested" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT DEFAULT 'pending_payment',
    "source" TEXT DEFAULT 'online',
    "customer" TEXT,
    "event" TEXT,
    "paymentCollection" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "discountSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketOrderLine" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "levelName" TEXT NOT NULL DEFAULT '',
    "phaseName" TEXT NOT NULL DEFAULT '',
    "seatLabel" TEXT NOT NULL DEFAULT '',
    "unitPriceCents" INTEGER DEFAULT 0,
    "serviceFeeCents" INTEGER DEFAULT 0,
    "facilityFeeCents" INTEGER DEFAULT 0,
    "taxCents" INTEGER DEFAULT 0,
    "quantity" INTEGER DEFAULT 0,
    "discountCents" INTEGER DEFAULT 0,
    "totalCents" INTEGER DEFAULT 0,
    "order" TEXT,
    "priceLevel" TEXT,
    "phase" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketCode" TEXT,
    "tokenHash" TEXT NOT NULL DEFAULT '',
    "holderName" TEXT NOT NULL DEFAULT '',
    "holderEmail" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'valid',
    "order" TEXT,
    "event" TEXT,
    "line" TEXT,
    "seatInventory" TEXT,
    "transferredFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "gate" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3),
    "result" TEXT DEFAULT 'admitted',
    "ticket" TEXT,
    "event" TEXT,
    "scannedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchSales" (
    "id" TEXT NOT NULL,
    "softGrossCents" INTEGER DEFAULT 0,
    "hardGrossCents" INTEGER DEFAULT 0,
    "venueSoftSplitBps" INTEGER DEFAULT 0,
    "venueHardSplitBps" INTEGER DEFAULT 0,
    "venueShareCents" INTEGER DEFAULT 0,
    "sellerFeeCents" INTEGER DEFAULT 0,
    "countIn" JSONB,
    "countOut" JSONB,
    "event" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchSales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarSales" (
    "id" TEXT NOT NULL,
    "grossCents" INTEGER DEFAULT 0,
    "promoterShareBps" INTEGER DEFAULT 0,
    "event" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarSales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL DEFAULT '',
    "version" INTEGER DEFAULT 1,
    "ticketGrossCents" INTEGER DEFAULT 0,
    "ticketFeesCents" INTEGER DEFAULT 0,
    "taxCents" INTEGER DEFAULT 0,
    "compCount" INTEGER DEFAULT 0,
    "paidCount" INTEGER DEFAULT 0,
    "netBoxOfficeCents" INTEGER DEFAULT 0,
    "totalExpensesCents" INTEGER DEFAULT 0,
    "cappedExpensesCents" INTEGER DEFAULT 0,
    "breakevenCents" INTEGER DEFAULT 0,
    "splitPointCents" INTEGER DEFAULT 0,
    "artistGuaranteeCents" INTEGER DEFAULT 0,
    "artistOverageCents" INTEGER DEFAULT 0,
    "artistTotalCents" INTEGER DEFAULT 0,
    "merchVenueShareCents" INTEGER DEFAULT 0,
    "depositsPaidCents" INTEGER DEFAULT 0,
    "balanceDueArtistCents" INTEGER DEFAULT 0,
    "promoterNetCents" INTEGER DEFAULT 0,
    "computedSnapshot" JSONB,
    "approvals" JSONB,
    "status" TEXT DEFAULT 'draft',
    "event" TEXT,
    "previousVersion" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementLine" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "sourceRef" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER DEFAULT 0,
    "roundingRemainder" INTEGER DEFAULT 0,
    "kind" TEXT DEFAULT 'gross',
    "settlement" TEXT,
    "approvedBy" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistPayment" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT '',
    "reference" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER DEFAULT 0,
    "kind" TEXT DEFAULT 'deposit',
    "status" TEXT DEFAULT 'scheduled',
    "settlement" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT '',
    "targetList" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "requestId" TEXT NOT NULL DEFAULT '',
    "before" JSONB,
    "after" JSONB,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "refundApprovalThresholdCents" INTEGER DEFAULT 0,
    "manager" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "isInstalled" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "createPaymentFunction" TEXT NOT NULL DEFAULT '',
    "capturePaymentFunction" TEXT NOT NULL DEFAULT '',
    "refundPaymentFunction" TEXT NOT NULL DEFAULT '',
    "getPaymentStatusFunction" TEXT NOT NULL DEFAULT '',
    "generatePaymentLinkFunction" TEXT NOT NULL DEFAULT '',
    "handleWebhookFunction" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCollection" (
    "id" TEXT NOT NULL,
    "description" "PaymentCollectionDescriptionType" DEFAULT 'default',
    "amount" INTEGER NOT NULL,
    "authorizedAmount" INTEGER DEFAULT 0,
    "refundedAmount" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "isInitiated" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "data" JSONB DEFAULT '{}',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "paymentCollection" TEXT,
    "paymentProvider" TEXT,
    "paymentAuthorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "reservedAt" TIMESTAMP(3),
    "refundedAmount" INTEGER DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "data" JSONB,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT DEFAULT 'credit_card',
    "paymentProvider" TEXT,
    "providerPaymentId" TEXT NOT NULL DEFAULT '',
    "cardLast4" TEXT NOT NULL DEFAULT '',
    "cardBrand" TEXT NOT NULL DEFAULT '',
    "tipAmount" INTEGER DEFAULT 0,
    "isSplitPayment" BOOLEAN NOT NULL DEFAULT false,
    "splitPaymentIndex" INTEGER,
    "splitTotal" INTEGER,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "order" TEXT,
    "paymentCollection" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'processing',
    "reason" TEXT NOT NULL DEFAULT '',
    "providerRefundId" TEXT NOT NULL DEFAULT '',
    "providerData" JSONB,
    "processedAt" TIMESTAMP(3),
    "payment" TEXT,
    "order" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL DEFAULT '',
    "providerCode" TEXT NOT NULL DEFAULT '',
    "providerEventId" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'received',
    "payload" JSONB,
    "rawBody" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER DEFAULT 0,
    "receivedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "payment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "requestMethod" TEXT NOT NULL DEFAULT '',
    "requestParams" JSONB,
    "requestPath" TEXT NOT NULL DEFAULT '',
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "recoveryPoint" TEXT NOT NULL DEFAULT 'started',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChartSection_priceLevel_sections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PriceLevel_promoCode_priceLevels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductionHold_seats" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_InventoryHold_seats" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_clientId_key" ON "OAuthApp"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_token_key" ON "OAuthToken"("token");

-- CreateIndex
CREATE INDEX "OAuthToken_clientId_idx" ON "OAuthToken"("clientId");

-- CreateIndex
CREATE INDEX "OAuthToken_user_idx" ON "OAuthToken"("user");

-- CreateIndex
CREATE INDEX "SeatingChart_venue_idx" ON "SeatingChart"("venue");

-- CreateIndex
CREATE INDEX "ChartSection_chart_idx" ON "ChartSection"("chart");

-- CreateIndex
CREATE INDEX "Seat_chartSection_idx" ON "Seat"("chartSection");

-- CreateIndex
CREATE INDEX "Artist_agency_idx" ON "Artist"("agency");

-- CreateIndex
CREATE INDEX "Tour_artist_idx" ON "Tour"("artist");

-- CreateIndex
CREATE INDEX "Event_venue_idx" ON "Event"("venue");

-- CreateIndex
CREATE INDEX "Event_seatingChart_idx" ON "Event"("seatingChart");

-- CreateIndex
CREATE INDEX "Event_tour_idx" ON "Event"("tour");

-- CreateIndex
CREATE INDEX "Event_promoter_idx" ON "Event"("promoter");

-- CreateIndex
CREATE INDEX "EventArtist_event_idx" ON "EventArtist"("event");

-- CreateIndex
CREATE INDEX "EventArtist_artist_idx" ON "EventArtist"("artist");

-- CreateIndex
CREATE UNIQUE INDEX "DateHold_rankKey_key" ON "DateHold"("rankKey");

-- CreateIndex
CREATE INDEX "DateHold_venue_idx" ON "DateHold"("venue");

-- CreateIndex
CREATE INDEX "DateHold_artist_idx" ON "DateHold"("artist");

-- CreateIndex
CREATE INDEX "DateHold_agency_idx" ON "DateHold"("agency");

-- CreateIndex
CREATE INDEX "DateHold_event_idx" ON "DateHold"("event");

-- CreateIndex
CREATE INDEX "Offer_event_idx" ON "Offer"("event");

-- CreateIndex
CREATE INDEX "Offer_artist_idx" ON "Offer"("artist");

-- CreateIndex
CREATE INDEX "Offer_eventArtist_idx" ON "Offer"("eventArtist");

-- CreateIndex
CREATE INDEX "EventExpense_event_idx" ON "EventExpense"("event");

-- CreateIndex
CREATE INDEX "PriceLevel_event_idx" ON "PriceLevel"("event");

-- CreateIndex
CREATE INDEX "PriceLevelPhase_priceLevel_idx" ON "PriceLevelPhase"("priceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "SeatInventory_holdKey_key" ON "SeatInventory"("holdKey");

-- CreateIndex
CREATE UNIQUE INDEX "SeatInventory_occupancyKey_key" ON "SeatInventory"("occupancyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SeatInventory_eventSeatKey_key" ON "SeatInventory"("eventSeatKey");

-- CreateIndex
CREATE INDEX "SeatInventory_event_idx" ON "SeatInventory"("event");

-- CreateIndex
CREATE INDEX "SeatInventory_seat_idx" ON "SeatInventory"("seat");

-- CreateIndex
CREATE INDEX "SeatInventory_priceLevel_idx" ON "SeatInventory"("priceLevel");

-- CreateIndex
CREATE INDEX "ProductionHold_event_idx" ON "ProductionHold"("event");

-- CreateIndex
CREATE INDEX "ProductionHold_priceLevel_idx" ON "ProductionHold"("priceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryHold_holdKey_key" ON "InventoryHold"("holdKey");

-- CreateIndex
CREATE INDEX "InventoryHold_event_idx" ON "InventoryHold"("event");

-- CreateIndex
CREATE INDEX "InventoryHold_priceLevel_idx" ON "InventoryHold"("priceLevel");

-- CreateIndex
CREATE INDEX "InventoryHold_phase_idx" ON "InventoryHold"("phase");

-- CreateIndex
CREATE INDEX "InventoryHold_customer_idx" ON "InventoryHold"("customer");

-- CreateIndex
CREATE INDEX "InventoryHold_order_idx" ON "InventoryHold"("order");

-- CreateIndex
CREATE INDEX "InventoryHold_promoCode_idx" ON "InventoryHold"("promoCode");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_event_idx" ON "PromoCode"("event");

-- CreateIndex
CREATE INDEX "PromoCode_tour_idx" ON "PromoCode"("tour");

-- CreateIndex
CREATE INDEX "PromoRedemption_promoCode_idx" ON "PromoRedemption"("promoCode");

-- CreateIndex
CREATE INDEX "PromoRedemption_hold_idx" ON "PromoRedemption"("hold");

-- CreateIndex
CREATE INDEX "PromoRedemption_order_idx" ON "PromoRedemption"("order");

-- CreateIndex
CREATE UNIQUE INDEX "TicketOrder_orderNumber_key" ON "TicketOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "TicketOrder_customer_idx" ON "TicketOrder"("customer");

-- CreateIndex
CREATE INDEX "TicketOrder_event_idx" ON "TicketOrder"("event");

-- CreateIndex
CREATE INDEX "TicketOrder_paymentCollection_idx" ON "TicketOrder"("paymentCollection");

-- CreateIndex
CREATE INDEX "TicketOrderLine_order_idx" ON "TicketOrderLine"("order");

-- CreateIndex
CREATE INDEX "TicketOrderLine_priceLevel_idx" ON "TicketOrderLine"("priceLevel");

-- CreateIndex
CREATE INDEX "TicketOrderLine_phase_idx" ON "TicketOrderLine"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketCode_key" ON "Ticket"("ticketCode");

-- CreateIndex
CREATE INDEX "Ticket_order_idx" ON "Ticket"("order");

-- CreateIndex
CREATE INDEX "Ticket_event_idx" ON "Ticket"("event");

-- CreateIndex
CREATE INDEX "Ticket_line_idx" ON "Ticket"("line");

-- CreateIndex
CREATE INDEX "Ticket_seatInventory_idx" ON "Ticket"("seatInventory");

-- CreateIndex
CREATE INDEX "Ticket_transferredFrom_idx" ON "Ticket"("transferredFrom");

-- CreateIndex
CREATE INDEX "ScanEvent_ticket_idx" ON "ScanEvent"("ticket");

-- CreateIndex
CREATE INDEX "ScanEvent_event_idx" ON "ScanEvent"("event");

-- CreateIndex
CREATE INDEX "ScanEvent_scannedBy_idx" ON "ScanEvent"("scannedBy");

-- CreateIndex
CREATE INDEX "MerchSales_event_idx" ON "MerchSales"("event");

-- CreateIndex
CREATE INDEX "BarSales_event_idx" ON "BarSales"("event");

-- CreateIndex
CREATE INDEX "Settlement_event_idx" ON "Settlement"("event");

-- CreateIndex
CREATE INDEX "Settlement_previousVersion_idx" ON "Settlement"("previousVersion");

-- CreateIndex
CREATE INDEX "SettlementLine_settlement_idx" ON "SettlementLine"("settlement");

-- CreateIndex
CREATE INDEX "SettlementLine_approvedBy_idx" ON "SettlementLine"("approvedBy");

-- CreateIndex
CREATE INDEX "ArtistPayment_settlement_idx" ON "ArtistPayment"("settlement");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_idx" ON "AuditEvent"("actor");

-- CreateIndex
CREATE INDEX "StoreSettings_manager_idx" ON "StoreSettings"("manager");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_idempotencyKey_key" ON "PaymentSession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentSession_paymentCollection_idx" ON "PaymentSession"("paymentCollection");

-- CreateIndex
CREATE INDEX "PaymentSession_paymentProvider_idx" ON "PaymentSession"("paymentProvider");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_paymentProvider_idx" ON "Payment"("paymentProvider");

-- CreateIndex
CREATE INDEX "Payment_order_idx" ON "Payment"("order");

-- CreateIndex
CREATE INDEX "Payment_paymentCollection_idx" ON "Payment"("paymentCollection");

-- CreateIndex
CREATE INDEX "Payment_processedBy_idx" ON "Payment"("processedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_payment_idx" ON "Refund"("payment");

-- CreateIndex
CREATE INDEX "Refund_order_idx" ON "Refund"("order");

-- CreateIndex
CREATE INDEX "Refund_requestedBy_idx" ON "Refund"("requestedBy");

-- CreateIndex
CREATE INDEX "Refund_approvedBy_idx" ON "Refund"("approvedBy");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventKey_key" ON "PaymentWebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerCode_idx" ON "PaymentWebhookEvent"("providerCode");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerEventId_idx" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_eventType_idx" ON "PaymentWebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_receivedAt_idx" ON "PaymentWebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_payment_idx" ON "PaymentWebhookEvent"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_idempotencyKey_key" ON "IdempotencyKey"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "_ChartSection_priceLevel_sections_AB_unique" ON "_ChartSection_priceLevel_sections"("A", "B");

-- CreateIndex
CREATE INDEX "_ChartSection_priceLevel_sections_B_index" ON "_ChartSection_priceLevel_sections"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PriceLevel_promoCode_priceLevels_AB_unique" ON "_PriceLevel_promoCode_priceLevels"("A", "B");

-- CreateIndex
CREATE INDEX "_PriceLevel_promoCode_priceLevels_B_index" ON "_PriceLevel_promoCode_priceLevels"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductionHold_seats_AB_unique" ON "_ProductionHold_seats"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductionHold_seats_B_index" ON "_ProductionHold_seats"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_InventoryHold_seats_AB_unique" ON "_InventoryHold_seats"("A", "B");

-- CreateIndex
CREATE INDEX "_InventoryHold_seats_B_index" ON "_InventoryHold_seats"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingChart" ADD CONSTRAINT "SeatingChart_venue_fkey" FOREIGN KEY ("venue") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartSection" ADD CONSTRAINT "ChartSection_chart_fkey" FOREIGN KEY ("chart") REFERENCES "SeatingChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_chartSection_fkey" FOREIGN KEY ("chartSection") REFERENCES "ChartSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_agency_fkey" FOREIGN KEY ("agency") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_artist_fkey" FOREIGN KEY ("artist") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venue_fkey" FOREIGN KEY ("venue") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seatingChart_fkey" FOREIGN KEY ("seatingChart") REFERENCES "SeatingChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tour_fkey" FOREIGN KEY ("tour") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_promoter_fkey" FOREIGN KEY ("promoter") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventArtist" ADD CONSTRAINT "EventArtist_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventArtist" ADD CONSTRAINT "EventArtist_artist_fkey" FOREIGN KEY ("artist") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateHold" ADD CONSTRAINT "DateHold_venue_fkey" FOREIGN KEY ("venue") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateHold" ADD CONSTRAINT "DateHold_artist_fkey" FOREIGN KEY ("artist") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateHold" ADD CONSTRAINT "DateHold_agency_fkey" FOREIGN KEY ("agency") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateHold" ADD CONSTRAINT "DateHold_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_artist_fkey" FOREIGN KEY ("artist") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_eventArtist_fkey" FOREIGN KEY ("eventArtist") REFERENCES "EventArtist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceLevel" ADD CONSTRAINT "PriceLevel_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceLevelPhase" ADD CONSTRAINT "PriceLevelPhase_priceLevel_fkey" FOREIGN KEY ("priceLevel") REFERENCES "PriceLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInventory" ADD CONSTRAINT "SeatInventory_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInventory" ADD CONSTRAINT "SeatInventory_seat_fkey" FOREIGN KEY ("seat") REFERENCES "Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInventory" ADD CONSTRAINT "SeatInventory_priceLevel_fkey" FOREIGN KEY ("priceLevel") REFERENCES "PriceLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionHold" ADD CONSTRAINT "ProductionHold_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionHold" ADD CONSTRAINT "ProductionHold_priceLevel_fkey" FOREIGN KEY ("priceLevel") REFERENCES "PriceLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_priceLevel_fkey" FOREIGN KEY ("priceLevel") REFERENCES "PriceLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_phase_fkey" FOREIGN KEY ("phase") REFERENCES "PriceLevelPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_order_fkey" FOREIGN KEY ("order") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHold" ADD CONSTRAINT "InventoryHold_promoCode_fkey" FOREIGN KEY ("promoCode") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_tour_fkey" FOREIGN KEY ("tour") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCode_fkey" FOREIGN KEY ("promoCode") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_hold_fkey" FOREIGN KEY ("hold") REFERENCES "InventoryHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_order_fkey" FOREIGN KEY ("order") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_paymentCollection_fkey" FOREIGN KEY ("paymentCollection") REFERENCES "PaymentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderLine" ADD CONSTRAINT "TicketOrderLine_order_fkey" FOREIGN KEY ("order") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderLine" ADD CONSTRAINT "TicketOrderLine_priceLevel_fkey" FOREIGN KEY ("priceLevel") REFERENCES "PriceLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderLine" ADD CONSTRAINT "TicketOrderLine_phase_fkey" FOREIGN KEY ("phase") REFERENCES "PriceLevelPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_order_fkey" FOREIGN KEY ("order") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_line_fkey" FOREIGN KEY ("line") REFERENCES "TicketOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_seatInventory_fkey" FOREIGN KEY ("seatInventory") REFERENCES "SeatInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_transferredFrom_fkey" FOREIGN KEY ("transferredFrom") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_ticket_fkey" FOREIGN KEY ("ticket") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchSales" ADD CONSTRAINT "MerchSales_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarSales" ADD CONSTRAINT "BarSales_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_event_fkey" FOREIGN KEY ("event") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_previousVersion_fkey" FOREIGN KEY ("previousVersion") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementLine" ADD CONSTRAINT "SettlementLine_settlement_fkey" FOREIGN KEY ("settlement") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementLine" ADD CONSTRAINT "SettlementLine_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistPayment" ADD CONSTRAINT "ArtistPayment_settlement_fkey" FOREIGN KEY ("settlement") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_manager_fkey" FOREIGN KEY ("manager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_paymentCollection_fkey" FOREIGN KEY ("paymentCollection") REFERENCES "PaymentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_order_fkey" FOREIGN KEY ("order") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentCollection_fkey" FOREIGN KEY ("paymentCollection") REFERENCES "PaymentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_order_fkey" FOREIGN KEY ("order") REFERENCES "TicketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChartSection_priceLevel_sections" ADD CONSTRAINT "_ChartSection_priceLevel_sections_A_fkey" FOREIGN KEY ("A") REFERENCES "ChartSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChartSection_priceLevel_sections" ADD CONSTRAINT "_ChartSection_priceLevel_sections_B_fkey" FOREIGN KEY ("B") REFERENCES "PriceLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PriceLevel_promoCode_priceLevels" ADD CONSTRAINT "_PriceLevel_promoCode_priceLevels_A_fkey" FOREIGN KEY ("A") REFERENCES "PriceLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PriceLevel_promoCode_priceLevels" ADD CONSTRAINT "_PriceLevel_promoCode_priceLevels_B_fkey" FOREIGN KEY ("B") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductionHold_seats" ADD CONSTRAINT "_ProductionHold_seats_A_fkey" FOREIGN KEY ("A") REFERENCES "ProductionHold"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductionHold_seats" ADD CONSTRAINT "_ProductionHold_seats_B_fkey" FOREIGN KEY ("B") REFERENCES "SeatInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InventoryHold_seats" ADD CONSTRAINT "_InventoryHold_seats_A_fkey" FOREIGN KEY ("A") REFERENCES "InventoryHold"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InventoryHold_seats" ADD CONSTRAINT "_InventoryHold_seats_B_fkey" FOREIGN KEY ("B") REFERENCES "SeatInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
