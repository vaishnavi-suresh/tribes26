import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { MarketInsight } from './pages/MarketInsight'
import { DocumentAnalysis } from './pages/DocumentAnalysis'
import { FinancialReport } from './pages/FinancialReport'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MarketInsight />} />
          <Route path="/documents" element={<DocumentAnalysis />} />
          <Route path="/financials" element={<FinancialReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
