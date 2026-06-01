import { prisma } from './prisma';

interface TelemetryData {
  manifestId: string;
  toolName: string;
  agentId?: string;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  errorMsg?: string;
}

export async function logTelemetry(data: TelemetryData) {
  try {
    await prisma.telemetry.create({ data });
  } catch (err) {
    // Never let telemetry crash the main flow
    console.error('Telemetry log failed:', err);
  }
}
