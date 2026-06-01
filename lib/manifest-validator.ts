import { z } from 'zod';

const ToolSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  description: z.string().optional(),
  endpoint: z.string().min(1, 'Tool endpoint is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});

export const ManifestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().default('1.0.0'),
  description: z.string().min(1, 'Description is required'),
  serverUrl: z.string().url('serverUrl must be a valid URL'),
  authType: z.enum(['none', 'apikey', 'bearer', 'oauth2']).default('none'),
  authHeader: z.string().optional(),
  domain: z.string().optional(),
  tools: z.array(ToolSchema).min(1, 'At least one tool is required'),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export type FieldValidationError = {
  field: string;
  message: string;
};

function toFieldErrors(error: z.ZodError): FieldValidationError[] {
  return error.errors.map((e) => ({
    field: e.path.length > 0 ? e.path.join('.') : 'body',
    message: e.message,
  }));
}

export function validateManifest(data: unknown) {
  const result = ManifestSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors = toFieldErrors(result.error);
    return {
      valid: false as const,
      fieldErrors,
      errors: fieldErrors.map((e) => `${e.field}: ${e.message}`),
      data: null,
    };
  }
  return { valid: true as const, data: result.data, fieldErrors: [], errors: [] };
}

export function validationErrorResponse(fieldErrors: FieldValidationError[]) {
  return {
    error: 'Validation failed',
    fieldErrors,
    details: fieldErrors.map((e) => `${e.field}: ${e.message}`),
  };
}
