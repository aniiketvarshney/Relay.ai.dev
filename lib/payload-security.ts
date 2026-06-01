const MAX_PAYLOAD_BYTES = 100_000;
const MAX_DEPTH = 20;
const MAX_STRING_SCAN_CHARS = 50_000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Common prompt-injection phrases (case-insensitive). */
const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    label: 'ignore previous instructions',
  },
  {
    pattern: /disregard\s+(your\s+)?(system|previous)\s+(prompt|instructions)/i,
    label: 'disregard system instructions',
  },
  {
    pattern: /override\s+(system|safety|security)\s+(prompt|instructions|rules)/i,
    label: 'override system rules',
  },
  {
    pattern: /you\s+are\s+now\s+(in\s+)?(developer|admin|unrestricted|jailbreak)\s+mode/i,
    label: 'role override',
  },
  {
    pattern: /\b(jailbreak|dan\s+mode)\b/i,
    label: 'jailbreak attempt',
  },
  {
    pattern: /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
    label: 'prompt exfiltration',
  },
  {
    pattern: /repeat\s+(the\s+)?(system\s+)?(prompt|instructions)\s+verbatim/i,
    label: 'prompt exfiltration',
  },
  {
    pattern: /bypass\s+(all\s+)?(safety|security|content)\s+(filters?|rules|restrictions)/i,
    label: 'safety bypass',
  },
  {
    pattern: /act\s+as\s+if\s+you\s+have\s+no\s+(restrictions|rules|limits)/i,
    label: 'restriction bypass',
  },
  {
    pattern: /<\|im_start\|>|<\|im_end\|>|<<\s*SYS\s*>>/i,
    label: 'delimiter injection',
  },
  {
    pattern: /new\s+instructions\s*:/i,
    label: 'instruction injection',
  },
  {
    pattern: /do\s+anything\s+now/i,
    label: 'dan-style injection',
  },
];

export type SecurityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: string };

function fail(reason: string, code: string): SecurityCheckResult {
  return { allowed: false, reason, code };
}

function scanStringForInjection(text: string): SecurityCheckResult | null {
  const sample = text.length > MAX_STRING_SCAN_CHARS ? text.slice(0, MAX_STRING_SCAN_CHARS) : text;

  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(sample)) {
      return fail(`prompt injection pattern detected: ${label}`, 'PROMPT_INJECTION');
    }
  }

  return null;
}

function scanValue(value: unknown, depth: number): SecurityCheckResult | null {
  if (depth > MAX_DEPTH) {
    return fail(`payload nesting exceeds ${MAX_DEPTH} levels`, 'PAYLOAD_TOO_DEEP');
  }

  if (typeof value === 'string') {
    return scanStringForInjection(value);
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
    const keyInjection = scanStringForInjection(key);
    if (keyInjection) return keyInjection;

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
