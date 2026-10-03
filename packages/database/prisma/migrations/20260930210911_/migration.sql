-- CreateTable
CREATE TABLE "bot_sessions" (
    "senderPhone" TEXT NOT NULL,
    "activeBotId" TEXT NOT NULL DEFAULT 'admin',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_sessions_pkey" PRIMARY KEY ("senderPhone")
);
