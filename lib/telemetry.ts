import { prisma } from '@/lib/prisma';

interface TelemetryData {
  manifestId: string;
  toolName: string;
  agentId?: string;
  latencyMs?: number;
  success: boolean;
  errorType?: string;
  errorMsg?: string;
}

export async function logTelemetry(data: TelemetryData) {
  try {
    await prisma.telemetry.create({
      data: {
        manifestId: data.manifestId,
        toolName: data.toolName,
        eventType: data.errorType ?? 'TOOL_CALL',
        data: {},
        success: data.success,
        errorType: data.errorType,
      },
    });
  } catch (err) {
    console.error('Telemetry log failed:', err);
  }
}