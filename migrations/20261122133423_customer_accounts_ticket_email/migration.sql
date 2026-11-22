-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "refundPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "supportEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "supportPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "TicketOrder" ADD COLUMN     "confirmationMessageId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailConfirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);
