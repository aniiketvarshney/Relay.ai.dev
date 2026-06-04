// app/api/audit/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogger from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await AuditLogger.log(body);   // Just log it for now
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  // TODO: Later we will return real logs from database
  return NextResponse.json({
    message: "Audit logs API is ready",
    logs: [] // We will fill this later
  });
}