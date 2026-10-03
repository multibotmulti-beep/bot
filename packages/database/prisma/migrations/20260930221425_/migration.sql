/*
  Warnings:

  - You are about to drop the column `draftOptionName` on the `bot_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bot_sessions" DROP COLUMN "draftOptionName",
ADD COLUMN     "draftOptions" TEXT;
