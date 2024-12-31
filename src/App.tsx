import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import Index from './pages/Index';
import Auth from './pages/Auth';
import ClientSelection from './pages/ClientSelection';
import { Chat } from './components/Chat';
import PrivacyPolicy from './pages/PrivacyPolicy';
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/select-client" element={<ClientSelection />} />
        <Route path="/chat" element={<Chat threadId={''} />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
      <Analytics />
    </div>
  );
};

export default App;