-- AlterTable
ALTER TABLE "bot_sessions" ADD COLUMN     "draftName" TEXT,
ADD COLUMN     "draftOptionName" TEXT,
ADD COLUMN     "draftStyle" TEXT,
ADD COLUMN     "wizardStep" INTEGER NOT NULL DEFAULT 0;
