import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Index from './pages/Index'
import PrivacyPolicy from './pages/PrivacyPolicy'
import { Chat } from './components/Chat'
import ClientSelection from './pages/ClientSelection'
import Auth from './pages/Auth' // New import
import { Analytics } from "@vercel/analytics/react"

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Routes>
        <Analytics />
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/select-client" element={<ClientSelection />} />
        <Route path="/chat" element={<Chat threadId={''} />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    </div>
  )
}

export default App