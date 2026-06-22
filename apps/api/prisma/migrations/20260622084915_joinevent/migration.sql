-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "facebook_url" TEXT,
ADD COLUMN     "instagram_url" TEXT,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "twitter_url" TEXT,
ADD COLUMN     "website_url" TEXT,
ADD COLUMN     "youtube_url" TEXT;

-- CreateTable
CREATE TABLE "event_applications" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "applicant_user_id" UUID NOT NULL,
    "profile_id" UUID,
    "business_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "product_type" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "decision_at" TIMESTAMPTZ,
    "decision_by" UUID,
    "rejection_reason" TEXT,
    "booking_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_applications_event_id_status_idx" ON "event_applications"("event_id", "status");

-- CreateIndex
CREATE INDEX "event_applications_applicant_user_id_status_idx" ON "event_applications"("applicant_user_id", "status");

-- CreateIndex
CREATE INDEX "event_applications_profile_id_idx" ON "event_applications"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_applications_event_id_applicant_user_id_key" ON "event_applications"("event_id", "applicant_user_id");

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
