-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'approved_member', 'moderator', 'author', 'content_admin', 'analytics_admin', 'superadmin');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('draft', 'published', 'completed', 'removed');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('draft', 'scheduled', 'published', 'unpublished', 'removed');

-- CreateEnum
CREATE TYPE "AssetVersionType" AS ENUM ('main', 'teaser', 'directors_cut', 'bonus', 'replacement');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('iap_purchase', 'unlock_debit', 'refund_reversal', 'admin_adjustment', 'promo_credit');

-- CreateEnum
CREATE TYPE "IAPPlatform" AS ENUM ('apple', 'google');

-- CreateEnum
CREATE TYPE "IAPTransactionStatus" AS ENUM ('pending', 'validated', 'credited', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "EntitlementType" AS ENUM ('episode_unlock', 'season_pass', 'early_access', 'author_access');

-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('global', 'series', 'episode', 'author_qa');

-- CreateEnum
CREATE TYPE "VoteTargetType" AS ENUM ('thread', 'reply');

-- CreateEnum
CREATE TYPE "WikiRevisionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('ban', 'timeout', 'unban', 'delete_content', 'restore_content', 'pin', 'unpin', 'lock', 'approve_wiki', 'reject_wiki', 'warn');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('user', 'thread', 'reply', 'wiki_revision', 'wiki_page');

-- CreateEnum
CREATE TYPE "AbuseReportCategory" AS ENUM ('spam', 'harassment', 'hate_speech', 'misinformation', 'spoiler', 'other');

-- CreateEnum
CREATE TYPE "AbuseReportStatus" AS ENUM ('open', 'under_review', 'resolved_actioned', 'resolved_dismissed');

-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "ExperimentType" AS ENUM ('thumbnail_ab', 'content_ab', 'feature_flag');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('draft', 'active', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "DistributionFormat" AS ENUM ('vertical_9_16', 'landscape_16_9', 'square_1_1');

-- CreateEnum
CREATE TYPE "DistributionPlatform" AS ENUM ('youtube', 'instagram', 'tiktok', 'internal');

-- CreateEnum
CREATE TYPE "DistributionJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "NotificationPreferenceType" AS ENUM ('episode_drops', 'countdown_reminders', 'community_replies', 'author_qa', 'promotions');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('user_register', 'user_login', 'user_ban', 'user_unban', 'user_timeout', 'user_delete', 'series_create', 'series_update', 'series_delete', 'series_restore', 'episode_create', 'episode_update', 'episode_publish', 'episode_schedule', 'episode_delete', 'episode_restore', 'episode_unpublish', 'token_credit', 'token_debit', 'token_refund_reversal_auto', 'token_refund_reversal_manual', 'token_admin_adjustment', 'entitlement_grant', 'entitlement_revoke', 'wiki_approve', 'wiki_reject', 'content_delete', 'content_restore', 'content_pin', 'content_lock', 'report_resolve', 'iap_validate', 'iap_refund', 'playback_url_generate', 'distribution_job_create', 'distribution_job_complete', 'admin_action');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "is_verified_author" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "genre_tags" TEXT[],
    "cover_image_url" TEXT,
    "status" "SeriesStatus" NOT NULL DEFAULT 'draft',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "arc_label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "season_id" UUID,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_seconds" INTEGER,
    "is_gated" BOOLEAN NOT NULL DEFAULT false,
    "token_cost" INTEGER NOT NULL DEFAULT 0,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_assets" (
    "id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "version_type" "AssetVersionType" NOT NULL DEFAULT 'main',
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "gcs_bucket" TEXT NOT NULL,
    "gcs_object_key" TEXT NOT NULL,
    "file_size_bytes" BIGINT,
    "mime_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_ledger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "reference_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "token_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iap_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "IAPPlatform" NOT NULL,
    "store_transaction_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "token_amount" INTEGER NOT NULL,
    "amount_usd_cents" INTEGER,
    "receipt_data" TEXT,
    "validation_response" JSONB,
    "status" "IAPTransactionStatus" NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT NOT NULL,
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iap_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "EntitlementType" NOT NULL,
    "series_id" UUID,
    "season_id" UUID,
    "episode_id" UUID,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "ledger_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" UUID NOT NULL,
    "type" "ThreadType" NOT NULL,
    "series_id" UUID,
    "episode_id" UUID,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_replies" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "parent_id" UUID,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thread_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "user_id" UUID NOT NULL,
    "target_type" "VoteTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("user_id","target_type","target_id")
);

-- CreateTable
CREATE TABLE "wiki_pages" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "series_id" UUID,
    "taxonomy_path" TEXT,
    "tags" TEXT[],
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "current_rev_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_revisions" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "status" "WikiRevisionStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "version_num" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wiki_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "target_user_id" UUID,
    "target_type" "ModerationTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "reason" TEXT,
    "duration_secs" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "ModerationTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "category" "AbuseReportCategory" NOT NULL,
    "description" TEXT,
    "status" "AbuseReportStatus" NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "device_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "episode_drops" BOOLEAN NOT NULL DEFAULT true,
    "countdown_reminders" BOOLEAN NOT NULL DEFAULT true,
    "community_replies" BOOLEAN NOT NULL DEFAULT true,
    "author_qa" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ExperimentType" NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'draft',
    "traffic_split" JSONB NOT NULL,
    "metric_bindings" JSONB,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_assignments" (
    "user_id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "variant" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("user_id","experiment_id")
);

-- CreateTable
CREATE TABLE "distribution_jobs" (
    "id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "target_format" "DistributionFormat" NOT NULL,
    "target_platform" "DistributionPlatform" NOT NULL,
    "status" "DistributionJobStatus" NOT NULL DEFAULT 'pending',
    "input_asset_id" UUID,
    "output_gcs_key" TEXT,
    "ai_caption" TEXT,
    "ai_description" TEXT,
    "ai_tags" TEXT[],
    "ai_title_variants" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "distribution_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_role" TEXT,
    "action" "AuditAction" NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "payload" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_daily_snapshots" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "series_id" UUID,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "total_watch_minutes" BIGINT NOT NULL DEFAULT 0,
    "tokens_sold" BIGINT NOT NULL DEFAULT 0,
    "unlocks" INTEGER NOT NULL DEFAULT 0,
    "completion_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");
CREATE UNIQUE INDEX "seasons_series_id_number_key" ON "seasons"("series_id", "number");
CREATE INDEX "episodes_series_id_sort_order_idx" ON "episodes"("series_id", "sort_order");
CREATE INDEX "episodes_status_scheduled_at_idx" ON "episodes"("status", "scheduled_at");
CREATE INDEX "episode_assets_episode_id_is_active_idx" ON "episode_assets"("episode_id", "is_active");
CREATE UNIQUE INDEX "token_wallets_user_id_key" ON "token_wallets"("user_id");
CREATE UNIQUE INDEX "token_ledger_idempotency_key_key" ON "token_ledger"("idempotency_key");
CREATE INDEX "token_ledger_user_id_created_at_idx" ON "token_ledger"("user_id", "created_at" DESC);
CREATE UNIQUE INDEX "iap_transactions_store_transaction_id_key" ON "iap_transactions"("store_transaction_id");
CREATE UNIQUE INDEX "iap_transactions_idempotency_key_key" ON "iap_transactions"("idempotency_key");
CREATE INDEX "iap_transactions_user_id_idx" ON "iap_transactions"("user_id");
CREATE INDEX "entitlements_user_id_episode_id_idx" ON "entitlements"("user_id", "episode_id");
CREATE INDEX "entitlements_user_id_season_id_type_idx" ON "entitlements"("user_id", "season_id", "type");
CREATE INDEX "entitlements_user_id_series_id_type_idx" ON "entitlements"("user_id", "series_id", "type");
CREATE INDEX "threads_series_id_created_at_idx" ON "threads"("series_id", "created_at" DESC);
CREATE INDEX "threads_episode_id_idx" ON "threads"("episode_id");
CREATE INDEX "threads_type_created_at_idx" ON "threads"("type", "created_at" DESC);
CREATE INDEX "thread_replies_thread_id_created_at_idx" ON "thread_replies"("thread_id", "created_at");
CREATE UNIQUE INDEX "wiki_pages_slug_key" ON "wiki_pages"("slug");
CREATE INDEX "wiki_pages_series_id_idx" ON "wiki_pages"("series_id");
CREATE INDEX "wiki_revisions_page_id_status_idx" ON "wiki_revisions"("page_id", "status");
CREATE INDEX "wiki_revisions_status_created_at_idx" ON "wiki_revisions"("status", "created_at");
CREATE INDEX "moderation_actions_target_user_id_idx" ON "moderation_actions"("target_user_id");
CREATE INDEX "moderation_actions_actor_id_created_at_idx" ON "moderation_actions"("actor_id", "created_at" DESC);
CREATE INDEX "abuse_reports_status_created_at_idx" ON "abuse_reports"("status", "created_at");
CREATE INDEX "push_tokens_user_id_is_active_idx" ON "push_tokens"("user_id", "is_active");
CREATE UNIQUE INDEX "experiments_name_key" ON "experiments"("name");
CREATE INDEX "distribution_jobs_requested_by_created_at_idx" ON "distribution_jobs"("requested_by", "created_at" DESC);
CREATE INDEX "distribution_jobs_status_idx" ON "distribution_jobs"("status");
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log"("actor_id", "created_at" DESC);
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at" DESC);
CREATE INDEX "analytics_daily_snapshots_series_id_date_idx" ON "analytics_daily_snapshots"("series_id", "date" DESC);
CREATE UNIQUE INDEX "analytics_daily_snapshots_date_series_id_key" ON "analytics_daily_snapshots"("date", "series_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "series" ADD CONSTRAINT "series_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "episode_assets" ADD CONSTRAINT "episode_assets_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "episode_assets" ADD CONSTRAINT "episode_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "token_wallets" ADD CONSTRAINT "token_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iap_transactions" ADD CONSTRAINT "iap_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "token_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "threads" ADD CONSTRAINT "threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "threads" ADD CONSTRAINT "threads_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "threads" ADD CONSTRAINT "threads_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "thread_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distribution_jobs" ADD CONSTRAINT "distribution_jobs_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distribution_jobs" ADD CONSTRAINT "distribution_jobs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distribution_jobs" ADD CONSTRAINT "distribution_jobs_input_asset_id_fkey" FOREIGN KEY ("input_asset_id") REFERENCES "episode_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
