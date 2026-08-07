-- CreateTable
CREATE TABLE "question_audit_log_entries" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "changed_by" UUID,
    "action" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_audit_log_entries_question_id_idx" ON "question_audit_log_entries"("question_id");

-- AddForeignKey
ALTER TABLE "question_audit_log_entries" ADD CONSTRAINT "question_audit_log_entries_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_audit_log_entries" ADD CONSTRAINT "question_audit_log_entries_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
