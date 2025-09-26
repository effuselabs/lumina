-- Add security and audit logging models
-- Migration: Add SecurityLog and AuditLog models for comprehensive security monitoring

-- Create SecurityViolationType enum
CREATE TYPE "SecurityViolationType" AS ENUM (
  'UNAUTHORIZED_BUSINESS_ACCESS',
  'INVALID_BUSINESS_CONTEXT',
  'CROSS_TENANT_DATA_ACCESS',
  'INSUFFICIENT_PERMISSIONS',
  'RESOURCE_NOT_FOUND',
  'INVALID_RESOURCE_OWNERSHIP',
  'SUSPICIOUS_ACTIVITY',
  'RATE_LIMIT_EXCEEDED'
);

-- Create SecurityLog table
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "type" "SecurityViolationType" NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,
    "resourceId" TEXT,
    "resourceType" TEXT NOT NULL,
    "attemptedAction" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- Create AuditLog table
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SecurityLog
CREATE INDEX "security_logs_businessId_createdAt_idx" ON "security_logs"("businessId", "createdAt");
CREATE INDEX "security_logs_userId_createdAt_idx" ON "security_logs"("userId", "createdAt");
CREATE INDEX "security_logs_type_createdAt_idx" ON "security_logs"("type", "createdAt");
CREATE INDEX "security_logs_severity_createdAt_idx" ON "security_logs"("severity", "createdAt");
CREATE INDEX "security_logs_resourceType_resourceId_idx" ON "security_logs"("resourceType", "resourceId");

-- Create indexes for AuditLog
CREATE INDEX "audit_logs_businessId_createdAt_idx" ON "audit_logs"("businessId", "createdAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- Add foreign key constraints
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;