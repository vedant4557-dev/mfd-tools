-- CreateTable
CREATE TABLE "FundMaster" (
    "id" TEXT NOT NULL,
    "amfiCode" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "isin1" TEXT,
    "isin2" TEXT,
    "amcName" TEXT,
    "category" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "expenseRatio" DOUBLE PRECISION,
    "nav" DOUBLE PRECISION,
    "navDate" TIMESTAMP(3),
    "searchName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundMaster_amfiCode_key" ON "FundMaster"("amfiCode");

-- CreateIndex
CREATE INDEX "FundMaster_searchName_idx" ON "FundMaster"("searchName");

-- CreateIndex
CREATE INDEX "FundMaster_category_idx" ON "FundMaster"("category");
