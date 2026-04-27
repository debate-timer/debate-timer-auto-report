-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('AMPLITUDE');

-- CreateEnum
CREATE TYPE "MetricUnit" AS ENUM ('COUNT', 'RATIO', 'PERCENT', 'MILLISECONDS');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('WEEKLY_REPORT', 'MONTHLY_REPORT', 'ALERT');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('SCHEDULE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('TEST', 'REPORT', 'ALERT', 'OPS');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "MetricSource" NOT NULL DEFAULT 'AMPLITUDE',
    "unit" "MetricUnit" NOT NULL DEFAULT 'COUNT',
    "query_spec" JSONB NOT NULL,
    "query_spec_version" INTEGER NOT NULL DEFAULT 1,
    "direction" "Direction" NOT NULL,
    "min_sample_size" INTEGER NOT NULL DEFAULT 30,
    "warning_rule" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "metric_definition_id" TEXT NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'AMPLITUDE',
    "period_type" "PeriodType" NOT NULL,
    "period_key" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "segment_key" TEXT NOT NULL DEFAULT 'ALL',
    "segment_value" TEXT NOT NULL DEFAULT 'ALL',
    "value" DECIMAL(20,6) NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "query_spec_version" INTEGER NOT NULL,
    "raw_ref" JSONB,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "run_type" "RunType" NOT NULL,
    "target_period_key" TEXT NOT NULL,
    "report_version" INTEGER NOT NULL DEFAULT 1,
    "idempotency_key" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "trigger_type" "TriggerType" NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "report_run_id" TEXT NOT NULL,
    "channel_type" "DeliveryChannel" NOT NULL,
    "channel_target" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "response_ref" JSONB,
    "error_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_key_key" ON "metric_definitions"("key");

-- CreateIndex
CREATE INDEX "metric_snapshots_period_type_period_key_idx" ON "metric_snapshots"("period_type", "period_key");

-- CreateIndex
CREATE INDEX "metric_snapshots_source_idx" ON "metric_snapshots"("source");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_metric_definition_id_period_type_period_ke_key" ON "metric_snapshots"("metric_definition_id", "period_type", "period_key", "segment_key", "segment_value");

-- CreateIndex
CREATE UNIQUE INDEX "report_runs_idempotency_key_key" ON "report_runs"("idempotency_key");

-- CreateIndex
CREATE INDEX "report_runs_status_idx" ON "report_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_runs_run_type_target_period_key_report_version_key" ON "report_runs"("run_type", "target_period_key", "report_version");

-- CreateIndex
CREATE INDEX "deliveries_report_run_id_idx" ON "deliveries"("report_run_id");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_report_run_id_fkey" FOREIGN KEY ("report_run_id") REFERENCES "report_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
