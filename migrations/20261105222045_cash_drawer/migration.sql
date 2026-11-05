-- CreateTable
CREATE TABLE "CashDrawer" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "openKey" TEXT,
    "openingFloatCents" INTEGER NOT NULL,
    "cashSalesCents" INTEGER DEFAULT 0,
    "cashRefundsCents" INTEGER DEFAULT 0,
    "expectedCents" INTEGER,
    "countedCents" INTEGER,
    "varianceCents" INTEGER,
    "varianceReason" TEXT NOT NULL DEFAULT '',
    "count" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "openedBy" TEXT,
    "closedBy" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashDrawer_openKey_key" ON "CashDrawer"("openKey");

-- CreateIndex
CREATE INDEX "CashDrawer_status_idx" ON "CashDrawer"("status");

-- CreateIndex
CREATE INDEX "CashDrawer_openedBy_idx" ON "CashDrawer"("openedBy");

-- CreateIndex
CREATE INDEX "CashDrawer_closedBy_idx" ON "CashDrawer"("closedBy");

-- AddForeignKey
ALTER TABLE "CashDrawer" ADD CONSTRAINT "CashDrawer_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawer" ADD CONSTRAINT "CashDrawer_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
