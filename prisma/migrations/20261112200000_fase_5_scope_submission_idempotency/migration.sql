-- DropIndex
DROP INDEX "Submission_idempotencyKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "Submission_apiClientId_idempotencyKey_key" ON "Submission"("apiClientId", "idempotencyKey");
