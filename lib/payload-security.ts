const MAX_PAYLOAD_BYTES = 100_000;
const MAX_DEPTH = 20;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type SecurityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: string };

function fail(reason: string, code: string): SecurityCheckResult {
  return { allowed: false, reason, code };
}

function scanValue(value: unknown, depth: number): SecurityCheckResult | null {
  if (depth > MAX_DEPTH) {
    return fail(`payload nesting exceeds ${MAX_DEPTH} levels`, 'PAYLOAD_TOO_DEEP');
  }

  if (value === null || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const err = scanValue(item, depth + 1);
      if (err) return err;
    }
    return null;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return fail(`forbidden key in payload: ${key}`, 'FORBIDDEN_KEY');
    }
    const err = scanValue((value as Record<string, unknown>)[key], depth + 1);
    if (err) return err;
  }

  return null;
}

/** Validate proxy payload before forwarding to upstream tools. */
export function checkPayloadSecurity(payload: unknown): SecurityCheckResult {
  if (payload === undefined) {
    return fail('payload is required', 'MISSING_PAYLOAD');
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    return fail('payload must be JSON-serializable', 'INVALID_PAYLOAD');
  }

  if (serialized.length > MAX_PAYLOAD_BYTES) {
    return fail(`payload exceeds ${MAX_PAYLOAD_BYTES} bytes`, 'PAYLOAD_TOO_LARGE');
  }

  const scanError = scanValue(payload, 0);
  if (scanError) return scanError;

  return { allowed: true };
}
