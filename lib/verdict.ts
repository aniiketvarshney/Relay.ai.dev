export type Verdict = 'ALLOWED' | 'FLAGGED' | 'BLOCKED';

const BLOCKED_TYPES = new Set([
  'SECURITY_BLOCKED',
  'FORBIDDEN_KEY',
  'PAYLOAD_TOO_LARGE',
  'PAYLOAD_TOO_DEEP',
  'MISSING_PAYLOAD',
  'INVALID_PAYLOAD',
  'AUTH_REQUIRED',
]);

export function getVerdict(record: {
  success: boolean;
  errorType?: string | null;
}): Verdict {
  if (record.success) return 'ALLOWED';
  if (record.errorType && BLOCKED_TYPES.has(record.errorType)) return 'BLOCKED';
  if (record.errorType?.startsWith('SECURITY')) return 'BLOCKED';
  return 'FLAGGED';
}

export function getThreatType(errorType?: string | null, errorMsg?: string | null): string | null {
  if (!errorType) return null;
  if (errorMsg?.includes(':')) return errorMsg.split(':')[0]?.trim() ?? errorType;
  return errorType.replace(/_/g, ' ');
}
