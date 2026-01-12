-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_eventId_order_idx" ON "Activity"("eventId", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_eventId_isCompleted_idx" ON "Activity"("eventId", "isCompleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_eventId_isActive_idx" ON "Activity"("eventId", "isActive");
