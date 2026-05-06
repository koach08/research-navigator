import Anthropic from '@anthropic-ai/sdk';

let clientInstance: Anthropic | null = null;

export function getAnthropicClient(apiKey?: string): Anthropic | null {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  if (!clientInstance || apiKey) {
    clientInstance = new Anthropic({ apiKey: key });
  }
  return clientInstance;
}

export async function generateSummary(
  abstract: string,
  title: string,
  apiKey?: string
): Promise<{ summary_ja: string; summary_en: string; key_findings: string[] } | null> {
  const client = getAnthropicClient(apiKey);
  if (!client) return null;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `以下の学術論文のアブストラクトを分析してください。

タイトル: ${title}
アブストラクト: ${abstract}

以下のJSON形式で回答してください（JSONのみ、他のテキストは不要）:
{
  "summary_ja": "日本語での3行要約（研究目的、方法、主な知見）",
  "summary_en": "English summary in 3 sentences (purpose, method, key findings)",
  "key_findings": ["知見1", "知見2", "知見3"]
}`,
      },
    ],
  });

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}
