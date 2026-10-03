-- AlterTable
ALTER TABLE "bot_flows" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "bot_flows" ADD CONSTRAINT "bot_flows_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "bot_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
