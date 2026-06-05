// app/api/audit/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogger from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await AuditLogger.log(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit POST error:', error);   // Fixed: using the error
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Audit logs API is ready",
    logs: []
  });
}