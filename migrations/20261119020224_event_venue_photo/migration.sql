-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "photo_extension" TEXT,
ADD COLUMN     "photo_filesize" INTEGER,
ADD COLUMN     "photo_height" INTEGER,
ADD COLUMN     "photo_id" TEXT,
ADD COLUMN     "photo_width" INTEGER;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "photo_extension" TEXT,
ADD COLUMN     "photo_filesize" INTEGER,
ADD COLUMN     "photo_height" INTEGER,
ADD COLUMN     "photo_id" TEXT,
ADD COLUMN     "photo_width" INTEGER;
