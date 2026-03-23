import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { chatCompletion, type ChatModelId } from '../api/chat'
import { fetchLatest10K, extractFilingSection } from '../api/sec'
import { FINANCIAL_REPORT_SYSTEM_PROMPT, buildFinancialReportPrompt } from '../prompts'
import '../App.css'
import './FinancialReport.css'

interface FinancialDataPoint {
  year: number
  revenue: number | null
  grossProfit: number | null
  operatingIncome: number | null
  netIncome: number | null
  eps: number | null
}

interface FinancialData {
  companyName: string
  ticker: string
  currency: string
  data: FinancialDataPoint[]
}

const MODELS: { id: ChatModelId; name: string }[] = [
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
  { id: 'openai/gpt-5.4', name: 'GPT-5.4' },
  { id: 'google/gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
]

const ACCENT = '#c9a227'
const COLORS = ['#c9a227', '#6bb5a6', '#8b7ed8', '#e07a7a']

function formatMillions(value: number | undefined): string {
  if (value == null) return ''
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}T`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}B`
  return `$${value}M`
}

function parseAiResponse(raw: string): { financialData: FinancialData | null; narrative: string } {
  const match = raw.match(/<FINANCIAL_DATA>([\s\S]*?)<\/FINANCIAL_DATA>/)
  let financialData: FinancialData | null = null
  let narrative = raw

  if (match) {
    try {
      financialData = JSON.parse(match[1].trim())
    } catch {
      // leave as null
    }
    narrative = raw.replace(/<FINANCIAL_DATA>[\s\S]*?<\/FINANCIAL_DATA>/, '').trim()
  }

  return { financialData, narrative }
}

function deriveMargins(data: FinancialDataPoint[]) {
  return data.map(d => ({
    year: d.year,
    'Gross Margin': d.revenue && d.grossProfit ? +((d.grossProfit / d.revenue) * 100).toFixed(1) : null,
    'Operating Margin': d.revenue && d.operatingIncome ? +((d.operatingIncome / d.revenue) * 100).toFixed(1) : null,
    'Net Margin': d.revenue && d.netIncome ? +((d.netIncome / d.revenue) * 100).toFixed(1) : null,
  }))
}

export function FinancialReport() {
  const [ticker, setTicker] = useState('')
  const [model, setModel] = useState<ChatModelId>(MODELS[0].id)
  const [status, setStatus] = useState<string | null>(null)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const secKey = import.meta.env.VITE_SEC_EDGAR_API_KEY
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  const handleGenerate = async () => {
    const sym = ticker.trim().toUpperCase()
    if (!sym) return
    if (!secKey) { setError('Add VITE_SEC_EDGAR_API_KEY to your .env file'); return }
    if (!apiKey) { setError('Add VITE_OPENROUTER_API_KEY to your .env file'); return }

    setIsLoading(true)
    setError(null)
    setFinancialData(null)
    setNarrative(null)

    try {
      setStatus('Fetching latest 10-K from SEC EDGAR…')
      const filing = await fetchLatest10K(sym, secKey)

      setStatus(`Found filing for ${filing.companyName} (${filing.filedAt.slice(0, 10)}). Extracting financial data…`)
      const filingText = await extractFilingSection(filing.linkToHtml, '7', secKey)

      setStatus('Analyzing with AI…')
      const raw = await chatCompletion({
        model,
        systemPrompt: FINANCIAL_REPORT_SYSTEM_PROMPT,
        userPrompt: buildFinancialReportPrompt(sym, filing.companyName, filing.filedAt, filingText),
        apiKey,
      })

      const { financialData: fd, narrative: narr } = parseAiResponse(raw)
      setFinancialData(fd)
      setNarrative(narr)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsLoading(false)
      setStatus(null)
    }
  }

  const marginData = financialData ? deriveMargins(financialData.data) : []

  return (
    <div className="app fr-app">
      <header className="header">
        <h1>Financial Report</h1>
        <p className="subtitle">Enter a stock ticker to generate a unified financial report from SEC 10-K filings</p>
      </header>

      <section className="input-section">
        <div className="fr-input-row">
          <div className="model-selector">
            <label htmlFor="fr-model">Model</label>
            <select
              id="fr-model"
              value={model}
              onChange={e => setModel(e.target.value as ChatModelId)}
              disabled={isLoading}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <input
            className="fr-ticker-input"
            type="text"
            placeholder="e.g. AAPL"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            disabled={isLoading}
            maxLength={10}
          />
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isLoading || !ticker.trim()}
          >
            {isLoading ? <><span className="spinner" />Generating…</> : 'Generate Report'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
        {status && <p className="fr-status">{status}</p>}
      </section>

      {isLoading && !financialData && (
        <section className="output-section">
          <div className="loading-placeholder">
            <div className="loading-bar" />
            <div className="loading-bar delay-1" />
            <div className="loading-bar delay-2" />
          </div>
        </section>
      )}

      {financialData && (
        <section className="fr-charts-section">
          <h2 className="fr-company-title">
            {financialData.companyName}
            <span className="fr-ticker-badge">{financialData.ticker}</span>
          </h2>
          <p className="fr-currency">{financialData.currency}</p>

          <div className="fr-charts-grid">
            {/* Revenue & Income */}
            <div className="fr-chart-card">
              <h3>Revenue &amp; Income</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={financialData.data} barGap={4} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2b29" />
                  <XAxis dataKey="year" tick={{ fill: '#8b8685', fontSize: 12 }} />
                  <YAxis tickFormatter={v => formatMillions(v)} tick={{ fill: '#8b8685', fontSize: 11 }} width={70} />
                  <Tooltip
                    contentStyle={{ background: '#1a1918', border: '1px solid #2d2b29', borderRadius: 8 }}
                    labelStyle={{ color: '#e8e6e3' }}
                    formatter={(v: number, name: string) => [formatMillions(v), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8b8685' }} />
                  <Bar dataKey="revenue" name="Revenue" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="grossProfit" name="Gross Profit" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="operatingIncome" name="Operating Income" fill={COLORS[2]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="netIncome" name="Net Income" fill={COLORS[3]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Margin Trends */}
            <div className="fr-chart-card">
              <h3>Margin Trends (%)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={marginData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2b29" />
                  <XAxis dataKey="year" tick={{ fill: '#8b8685', fontSize: 12 }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#8b8685', fontSize: 11 }} width={50} />
                  <Tooltip
                    contentStyle={{ background: '#1a1918', border: '1px solid #2d2b29', borderRadius: 8 }}
                    labelStyle={{ color: '#e8e6e3' }}
                    formatter={(v: number, name: string) => [`${v}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8b8685' }} />
                  <Line type="monotone" dataKey="Gross Margin" stroke={COLORS[0]} strokeWidth={2} dot={{ fill: COLORS[0] }} />
                  <Line type="monotone" dataKey="Operating Margin" stroke={COLORS[1]} strokeWidth={2} dot={{ fill: COLORS[1] }} />
                  <Line type="monotone" dataKey="Net Margin" stroke={COLORS[2]} strokeWidth={2} dot={{ fill: COLORS[2] }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* EPS */}
            <div className="fr-chart-card fr-chart-card--half">
              <h3>Earnings Per Share (EPS)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={financialData.data} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2b29" />
                  <XAxis dataKey="year" tick={{ fill: '#8b8685', fontSize: 12 }} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#8b8685', fontSize: 11 }} width={50} />
                  <Tooltip
                    contentStyle={{ background: '#1a1918', border: '1px solid #2d2b29', borderRadius: 8 }}
                    labelStyle={{ color: '#e8e6e3' }}
                    formatter={(v: number) => [`$${v}`, 'EPS']}
                  />
                  <Bar dataKey="eps" name="EPS" fill={ACCENT} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {narrative && (
        <section className="output-section fr-narrative">
          <h2>Analysis</h2>
          <div className="deep-dive-content">
            {narrative.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i}>{line.slice(3)}</h3>
              if (line.startsWith('### ')) return <h4 key={i}>{line.slice(4)}</h4>
              if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="list-item">{line}</p>
              return <p key={i}>{line || <br />}</p>
            })}
          </div>
        </section>
      )}
    </div>
  )
}
