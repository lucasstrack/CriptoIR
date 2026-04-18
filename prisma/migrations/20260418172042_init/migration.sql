-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" DATETIME,
    "lastSyncedCursor" TEXT,
    "archivedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "contractAddress" TEXT,
    "decimals" INTEGER NOT NULL,
    "coingeckoId" TEXT
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "counterparty" TEXT,
    "assetId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "feeAmount" TEXT,
    "feeAssetId" TEXT,
    "status" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "classificationVersion" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_feeAssetId_fkey" FOREIGN KEY ("feeAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "priceUsd" TEXT NOT NULL,
    "priceBrl" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "PriceSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "totalUsd" TEXT NOT NULL,
    "totalBrl" TEXT NOT NULL,
    "breakdown" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "txCount" INTEGER NOT NULL,
    "error" TEXT,
    CONSTRAINT "SyncLog_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_network_address_key" ON "Wallet"("network", "address");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_network_contractAddress_key" ON "Asset"("network", "contractAddress");

-- CreateIndex
CREATE INDEX "Transaction_walletId_timestamp_idx" ON "Transaction"("walletId", "timestamp");

-- CreateIndex
CREATE INDEX "Transaction_network_txHash_idx" ON "Transaction"("network", "txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_walletId_txHash_direction_key" ON "Transaction"("walletId", "txHash", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_assetId_date_source_key" ON "PriceSnapshot"("assetId", "date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_weekStart_key" ON "PortfolioSnapshot"("weekStart");

