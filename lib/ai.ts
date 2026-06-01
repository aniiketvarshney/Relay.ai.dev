const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_GATEWAY_MODEL = 'google/gemini-2.0-flash';

type GenerateResult = { text: string; provider: string };

async function callAiGateway(prompt: string): Promise<GenerateResult | null> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null;

  const model = process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL;
  const response = await fetch(`${AI_GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  return text ? { text, provider: `vercel-ai-gateway (${model})` } : null;
}

async function callGemini(prompt: string): Promise<GenerateResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? { text, provider: 'gemini' } : null;
}

async function callGroq(prompt: string): Promise<GenerateResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  return text ? { text, provider: 'groq' } : null;
}

/** Try Vercel AI Gateway first, then Gemini, then Groq. */
export async function generateText(prompt: string): Promise<GenerateResult | null> {
  for (const provider of [callAiGateway, callGemini, callGroq]) {
    const result = await provider(prompt);
    if (result) return result;
  }
  return null;
}

export function getAiProviderStatus() {
  return {
    vercel_ai_gateway: Boolean(process.env.AI_GATEWAY_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
  };
}
