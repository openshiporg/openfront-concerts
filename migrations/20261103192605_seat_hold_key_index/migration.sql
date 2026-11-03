-- DropIndex
DROP INDEX "SeatInventory_holdKey_key";

-- CreateIndex
CREATE INDEX "SeatInventory_holdKey_idx" ON "SeatInventory"("holdKey");
