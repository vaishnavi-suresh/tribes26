const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export type ChatModelId =
  | 'anthropic/claude-opus-4.6'
  | 'anthropic/claude-sonnet-4.6'
  | 'openai/gpt-5.4'
  | 'google/gemini-3.1-pro'
  | 'openai/gpt-4o'
  | 'anthropic/claude-sonnet-4-20250514'
  | 'google/gemini-2.0-flash-001'
  | 'meta-llama/llama-3.1-70b-instruct'

export async function chatCompletion(params: {
  model: ChatModelId
  systemPrompt: string
  userPrompt: string
  apiKey: string
}): Promise<string> {
  const { model, systemPrompt, userPrompt, apiKey } = params

  if (!apiKey) throw new Error('Add VITE_OPENROUTER_API_KEY to your .env file')

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
