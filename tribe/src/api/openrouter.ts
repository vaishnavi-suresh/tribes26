const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export type OpenRouterModel =
  | 'openai/gpt-4o'
  | 'anthropic/claude-3.5-sonnet'
  | 'google/gemini-1.5-pro'

export async function chatCompletion(params: {
  model: OpenRouterModel
  systemPrompt: string
  userPrompt: string
  apiKey: string
}): Promise<string> {
  const { model, systemPrompt, userPrompt, apiKey } = params

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(typeof window !== 'undefined' && { 'HTTP-Referer': window.location.origin }),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `OpenRouter error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Invalid response from OpenRouter')
  }
  return content
}
