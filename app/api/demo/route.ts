import { NextRequest, NextResponse } from 'next/server';
import { generateText, getAiProviderStatus } from '@/lib/ai';
import { apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task, tools } = body;

    if (!task || typeof task !== 'string') {
      return apiError('`task` is required', 400);
    }
    if (!Array.isArray(tools)) {
      return apiError('`tools` must be an array', 400);
    }

    const toolList = tools
      .map((t: { name?: string; description?: string; serverUrl?: string; server_url?: string }) =>
        `- ${t.name}: ${t.description ?? 'No description'} (endpoint: ${t.serverUrl ?? t.server_url ?? 'unknown'})`
      )
      .join('\n');

    const prompt = `You are an autonomous AI agent. You discovered these tools from Relay:\n\n${toolList}\n\nTask: ${task}\n\nPick the right tool, explain why, show the exact API call you would make, and give the expected result. Be specific and concise.`;

    const aiResult = await generateText(prompt);
    if (aiResult) {
      return NextResponse.json({ result: aiResult.text, provider: aiResult.provider });
    }

    const status = getAiProviderStatus();
    return NextResponse.json({
      result:
        'No AI model available. Add AI_GATEWAY_API_KEY (Vercel AI Gateway), GEMINI_API_KEY, or GROQ_API_KEY.',
      providers: status,
    });
  } catch {
    return NextResponse.json({ result: 'Error reaching AI model. Please try again.' }, { status: 500 });
  }
}
