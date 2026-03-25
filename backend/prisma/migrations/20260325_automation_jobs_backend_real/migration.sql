ALTER TYPE "AutomationJobStatus" RENAME VALUE 'DONE' TO 'SUCCESS';

ALTER TABLE "automation_jobs"
    ADD COLUMN "type" TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN "result" JSONB,
    ADD COLUMN "error" TEXT NOT NULL DEFAULT '';

UPDATE "automation_jobs" AS job
SET
    "type" = COALESCE(
        NULLIF(LOWER(REPLACE(job."source"::text, '_', '-')), ''),
        'unknown'
    ),
    "payload" = jsonb_strip_nulls(
        jsonb_build_object(
            'sessionId', job."sessionId",
            'source', LOWER(REPLACE(job."source"::text, '_', '-')),
            'notes', job."notes",
            'attemptCount', job."attempts",
            'lastError', job."lastErrorMessage",
            'items', prepared."items",
            'metadata', COALESCE(job."metadataSnapshot", '{}'::jsonb)
        )
    ),
    "result" = jsonb_strip_nulls(
        jsonb_build_object(
            'attemptCount', job."attempts",
            'lastErrorCode', job."lastErrorCode",
            'lastErrorMessage', job."lastErrorMessage",
            'runStartedAt',
                CASE
                    WHEN job."runStartedAt" IS NULL THEN NULL
                    ELSE to_jsonb(job."runStartedAt")
                END,
            'runFinishedAt',
                CASE
                    WHEN job."runFinishedAt" IS NULL THEN NULL
                    ELSE to_jsonb(job."runFinishedAt")
                END,
            'runDuration', job."runDurationMs"
        )
    ),
    "error" = job."lastErrorMessage"
FROM (
    SELECT
        job_inner."id" AS "jobId",
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_strip_nulls(
                        jsonb_build_object(
                            'sequence', item."sequence",
                            'itemId', item."itemId",
                            'itemName', item."itemName",
                            'quantity', item."quantity",
                            'source', LOWER(REPLACE(item."source"::text, '_', '-')),
                            'supplier', item."supplier",
                            'currentStock', item."currentStock",
                            'idealStock', item."idealStock",
                            'orderAmount', item."orderAmount",
                            'status', item."status",
                            'area', item."area",
                            'unit', item."unit",
                            'rawLine', item."rawLine"
                        )
                    )
                    ORDER BY item."sequence"
                )
                FROM "automation_job_items" AS item
                WHERE item."automationJobId" = job_inner."id"
            ),
            '[]'::jsonb
        ) AS "items"
    FROM "automation_jobs" AS job_inner
) AS prepared
WHERE prepared."jobId" = job."id";

ALTER TABLE "automation_jobs"
    ALTER COLUMN "payload" DROP DEFAULT;
