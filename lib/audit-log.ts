// lib/audit-log.ts
// Advanced Audit Logging for Relay Security Proxy

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  agentId: string;
  toolName: string;
  actionType: string;
  payloadSummary: string;
  riskScore: number;
  status: 'allowed' | 'blocked' | 'approved' | 'reviewed';
  userId?: string;
  ip?: string;
  threatDetails?: string;
  metadata?: Record<string, unknown>;   // Fixed: no 'any'
}

export class AuditLogger {
  static async log(entry: Omit<AuditLogEntry, 'timestamp' | 'id'>) {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    console.log(`[RELAY-AUDIT] ${logEntry.status.toUpperCase()} | ${logEntry.toolName} | Risk: ${logEntry.riskScore}`);

    try {
      await fetch('/api/audit/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {});
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  }
}

export default AuditLogger;