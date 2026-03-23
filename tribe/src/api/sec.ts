const SEC_API_BASE = 'https://api.sec-api.io'

export interface SecFiling {
  id: string
  ticker: string
  companyName: string
  formType: string
  filedAt: string
  linkToHtml: string
  linkToFilingDetails: string
}

export async function fetchLatest10K(ticker: string, apiKey: string): Promise<SecFiling> {
  const response = await fetch(SEC_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({
      query: `ticker:"${ticker.toUpperCase()}" AND formType:"10-K"`,
      from: '0',
      size: '1',
      sort: [{ filedAt: { order: 'desc' } }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `SEC Query API error: ${response.status}`)
  }

  const data = await response.json()
  const filings: SecFiling[] = data.filings ?? []

  if (!filings.length) {
    throw new Error(`No 10-K filings found for ticker "${ticker.toUpperCase()}"`)
  }

  return filings[0]
}

export async function extractFilingSection(filingUrl: string, item: string, apiKey: string): Promise<string> {
  const url = `${SEC_API_BASE}/extractor?url=${encodeURIComponent(filingUrl)}&item=${item}&type=text`
  const response = await fetch(url, {
    headers: { 'Authorization': apiKey },
  })

  if (!response.ok) {
    throw new Error(`SEC Extractor API error: ${response.status}`)
  }

  const text = await response.text()
  // Truncate to 60k chars to stay within AI token limits
  return text.slice(0, 60_000)
}
