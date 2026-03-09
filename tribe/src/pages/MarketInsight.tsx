import { useState } from 'react'
import { chatCompletion, type OpenRouterModel } from '../api/openrouter'
import { MARKET_INSIGHT_SYSTEM_PROMPT, buildMarketInsightPrompt } from '../prompts'
import '../App.css'

const MODELS = [
  { id: 'openai/gpt-4o' as const, name: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet' as const, name: 'Claude 3.5 Sonnet' },
  { id: 'google/gemini-2.5-pro' as const, name: 'Gemini 2.5 Pro' },
] as const

export type ModelId = (typeof MODELS)[number]['id']

export function MarketInsight() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<ModelId>(MODELS[0].id)
  const [deepDive, setDeepDive] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    if (!apiKey) {
      setError('Add VITE_OPENROUTER_API_KEY to your .env file')
      return
    }

    setIsLoading(true)
    setDeepDive(null)
    setError(null)

    try {
      const content = await chatCompletion({
        model: model as OpenRouterModel,
        systemPrompt: MARKET_INSIGHT_SYSTEM_PROMPT,
        userPrompt: buildMarketInsightPrompt(prompt),
        apiKey,
      })
      setDeepDive(content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deep dive')
      setDeepDive(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Market Insight Generator</h1>
        <p className="subtitle">Enter an industry or market to receive a strategic deep dive</p>
      </header>

      <section className="input-section">
        <div className="model-selector">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value as ModelId)}
            disabled={isLoading}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="prompt-input"
          placeholder="e.g. Electric vehicle charging infrastructure in Southeast Asia"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={isLoading}
        />
        {error && <p className="error-message">{error}</p>}
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Generating...
            </>
          ) : (
            'Generate Deep Dive'
          )}
        </button>
      </section>

      {(isLoading || deepDive) && (
        <section className="output-section">
          <h2>Industry Deep Dive</h2>
          {isLoading ? (
            <div className="loading-placeholder">
              <div className="loading-bar" />
              <div className="loading-bar delay-1" />
              <div className="loading-bar delay-2" />
            </div>
          ) : deepDive ? (
            <div className="deep-dive-content">
              {deepDive.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return <h3 key={i}>{line.slice(3)}</h3>
                }
                if (line.startsWith('1. ') || line.startsWith('- ') || line.startsWith('* ')) {
                  return <p key={i} className="list-item">{line}</p>
                }
                return <p key={i}>{line || <br />}</p>
              })}
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
