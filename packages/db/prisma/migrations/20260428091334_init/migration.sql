-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GITHUB', 'CODEFORCES', 'LEETCODE');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'RE_CHECK', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('OAUTH', 'BIO_TOKEN', 'MANUAL');

-- CreateEnum
CREATE TYPE "HandleStatus" AS ENUM ('ACTIVE', 'DEAD', 'DISABLED');

-- CreateEnum
CREATE TYPE "FetchStatus" AS ENUM ('OK', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "RankScope" AS ENUM ('CAMPUS', 'YEAR', 'BRANCH', 'SECTION');

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regnoConfig" JSONB NOT NULL,
    "scoringConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "regno" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "branch" TEXT,
    "section" TEXT,
    "batchYear" INTEGER,
    "currentYear" INTEGER,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_handles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "verificationState" "VerificationState" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationMethod" "VerificationMethod",
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "oauthTokenEncrypted" BYTEA,
    "lastFetchedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "status" "HandleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_handles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "handleId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "fetchStatus" "FetchStatus" NOT NULL,
    "errorCode" TEXT,
    "scraperVersion" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "solvedEasy" INTEGER NOT NULL DEFAULT 0,
    "solvedMedium" INTEGER NOT NULL DEFAULT 0,
    "solvedHard" INTEGER NOT NULL DEFAULT 0,
    "contestRating" INTEGER,
    "peakRating" INTEGER,
    "contestsAttended" INTEGER NOT NULL DEFAULT 0,
    "topicMastery" JSONB NOT NULL DEFAULT '{}',
    "activeDays90" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "badges" JSONB NOT NULL DEFAULT '[]',
    "platformPercentile" DECIMAL(5,2),
    "normalizerVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "normalized_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codepulseScore" DECIMAL(6,2) NOT NULL,
    "components" JSONB NOT NULL,
    "verificationMult" DECIMAL(4,3) NOT NULL,
    "recencyDecay" DECIMAL(4,3) NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "userId" TEXT NOT NULL,
    "scope" "RankScope" NOT NULL,
    "scopeValue" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "percentile" DECIMAL(5,2) NOT NULL,
    "cohortSize" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("userId","scope","scopeValue")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" TEXT NOT NULL,
    "scope" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "payload" JSONB,
    "ip" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_institutionId_batchYear_branch_idx" ON "users"("institutionId", "batchYear", "branch");

-- CreateIndex
CREATE UNIQUE INDEX "users_institutionId_regno_key" ON "users"("institutionId", "regno");

-- CreateIndex
CREATE INDEX "platform_handles_userId_idx" ON "platform_handles"("userId");

-- CreateIndex
CREATE INDEX "platform_handles_verificationState_idx" ON "platform_handles"("verificationState");

-- CreateIndex
CREATE INDEX "platform_handles_platform_status_idx" ON "platform_handles"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_handles_platform_handle_key" ON "platform_handles"("platform", "handle");

-- CreateIndex
CREATE INDEX "snapshots_handleId_fetchedAt_idx" ON "snapshots"("handleId", "fetchedAt");

-- CreateIndex
CREATE INDEX "normalized_metrics_userId_idx" ON "normalized_metrics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "normalized_metrics_userId_platform_key" ON "normalized_metrics"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "scores_userId_key" ON "scores"("userId");

-- CreateIndex
CREATE INDEX "ranks_scope_scopeValue_rank_idx" ON "ranks"("scope", "scopeValue", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "badges_userId_badgeType_scope_key" ON "badges"("userId", "badgeType", "scope");

-- CreateIndex
CREATE INDEX "audit_logs_at_idx" ON "audit_logs"("at");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_handles" ADD CONSTRAINT "platform_handles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_handleId_fkey" FOREIGN KEY ("handleId") REFERENCES "platform_handles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_metrics" ADD CONSTRAINT "normalized_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranks" ADD CONSTRAINT "ranks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
