-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlTemplate" TEXT NOT NULL,
    "textTemplate" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preferences" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT,
    "email" TEXT NOT NULL,
    "receiveConfirmations" BOOLEAN NOT NULL DEFAULT true,
    "receiveReminders" BOOLEAN NOT NULL DEFAULT true,
    "receiveCancellations" BOOLEAN NOT NULL DEFAULT true,
    "receiveMarketing" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_queue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "templateType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "messageId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_booking_audit_logs" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sessionId" TEXT,
    "clientId" TEXT,
    "appointmentId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "requestId" TEXT,
    "eventData" JSONB,
    "responseTime" INTEGER,
    "securityFlags" TEXT[],
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "errorType" TEXT,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_booking_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_analytics_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_performance_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "duration" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_performance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_errors" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_alert_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_alerts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_type_idx" ON "email_templates"("type");

-- CreateIndex
CREATE INDEX "email_templates_businessId_isActive_idx" ON "email_templates"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_businessId_type_key" ON "email_templates"("businessId", "type");

-- CreateIndex
CREATE INDEX "email_preferences_email_idx" ON "email_preferences"("email");

-- CreateIndex
CREATE INDEX "email_preferences_businessId_clientId_idx" ON "email_preferences"("businessId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_businessId_email_key" ON "email_preferences"("businessId", "email");

-- CreateIndex
CREATE INDEX "email_queue_businessId_status_idx" ON "email_queue"("businessId", "status");

-- CreateIndex
CREATE INDEX "email_queue_scheduledAt_status_idx" ON "email_queue"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "email_queue_priority_status_idx" ON "email_queue"("priority", "status");

-- CreateIndex
CREATE INDEX "email_queue_appointmentId_idx" ON "email_queue"("appointmentId");

-- CreateIndex
CREATE INDEX "email_queue_businessId_createdAt_idx" ON "email_queue"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "public_booking_audit_logs_businessId_createdAt_idx" ON "public_booking_audit_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "public_booking_audit_logs_event_createdAt_idx" ON "public_booking_audit_logs"("event", "createdAt");

-- CreateIndex
CREATE INDEX "public_booking_audit_logs_riskLevel_createdAt_idx" ON "public_booking_audit_logs"("riskLevel", "createdAt");

-- CreateIndex
CREATE INDEX "public_booking_audit_logs_sessionId_createdAt_idx" ON "public_booking_audit_logs"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "public_booking_audit_logs_ipAddress_createdAt_idx" ON "public_booking_audit_logs"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "booking_analytics_events_businessId_eventType_timestamp_idx" ON "booking_analytics_events"("businessId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "booking_analytics_events_sessionId_timestamp_idx" ON "booking_analytics_events"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "booking_performance_events_businessId_eventType_timestamp_idx" ON "booking_performance_events"("businessId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "booking_performance_events_businessId_timestamp_idx" ON "booking_performance_events"("businessId", "timestamp");

-- CreateIndex
CREATE INDEX "booking_errors_businessId_errorType_severity_timestamp_idx" ON "booking_errors"("businessId", "errorType", "severity", "timestamp");

-- CreateIndex
CREATE INDEX "booking_errors_businessId_timestamp_idx" ON "booking_errors"("businessId", "timestamp");

-- CreateIndex
CREATE INDEX "booking_alert_rules_businessId_isActive_idx" ON "booking_alert_rules"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "booking_alerts_businessId_timestamp_idx" ON "booking_alerts"("businessId", "timestamp");

-- CreateIndex
CREATE INDEX "booking_alerts_ruleId_timestamp_idx" ON "booking_alerts"("ruleId", "timestamp");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_booking_audit_logs" ADD CONSTRAINT "public_booking_audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_booking_audit_logs" ADD CONSTRAINT "public_booking_audit_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_booking_audit_logs" ADD CONSTRAINT "public_booking_audit_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_alerts" ADD CONSTRAINT "booking_alerts_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "booking_alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
