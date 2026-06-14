-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('EQUITY', 'DEBT', 'HYBRID', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "SIPStatus" AS ENUM ('ACTIVE', 'PAUSED', 'MISSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('CONCENTRATION_RISK', 'ASSET_ALLOCATION', 'FUND_OVERLAP', 'HIGH_EXPENSE', 'SIP_HEALTH', 'PERFORMANCE');

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "casUploadId" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "investedValue" DOUBLE PRECISION NOT NULL,
    "xirr" DOUBLE PRECISION,
    "expenseRatio" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SIPRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "casUploadId" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "SIPStatus" NOT NULL DEFAULT 'ACTIVE',
    "missedCount" INTEGER NOT NULL DEFAULT 0,
    "lastDebitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SIPRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioInsight" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "casUploadId" TEXT NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAnalysis" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "casUploadId" TEXT NOT NULL,
    "portfolioScore" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "aiExplanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Holding_clientId_idx" ON "Holding"("clientId");

-- CreateIndex
CREATE INDEX "Holding_casUploadId_idx" ON "Holding"("casUploadId");

-- CreateIndex
CREATE INDEX "SIPRecord_clientId_idx" ON "SIPRecord"("clientId");

-- CreateIndex
CREATE INDEX "SIPRecord_casUploadId_idx" ON "SIPRecord"("casUploadId");

-- CreateIndex
CREATE INDEX "PortfolioInsight_clientId_idx" ON "PortfolioInsight"("clientId");

-- CreateIndex
CREATE INDEX "PortfolioInsight_casUploadId_idx" ON "PortfolioInsight"("casUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioAnalysis_casUploadId_key" ON "PortfolioAnalysis"("casUploadId");

-- CreateIndex
CREATE INDEX "PortfolioAnalysis_clientId_idx" ON "PortfolioAnalysis"("clientId");

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_casUploadId_fkey" FOREIGN KEY ("casUploadId") REFERENCES "CASUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIPRecord" ADD CONSTRAINT "SIPRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIPRecord" ADD CONSTRAINT "SIPRecord_casUploadId_fkey" FOREIGN KEY ("casUploadId") REFERENCES "CASUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioInsight" ADD CONSTRAINT "PortfolioInsight_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioInsight" ADD CONSTRAINT "PortfolioInsight_casUploadId_fkey" FOREIGN KEY ("casUploadId") REFERENCES "CASUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAnalysis" ADD CONSTRAINT "PortfolioAnalysis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAnalysis" ADD CONSTRAINT "PortfolioAnalysis_casUploadId_fkey" FOREIGN KEY ("casUploadId") REFERENCES "CASUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
