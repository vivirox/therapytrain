import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface ClientProfile {
  name: string
  age: number
  primaryIssue: string
  background: string
  keyTraits: Array<string>
  complexity: string
}

const ClientSelection: React.FC = () => {
  const navigate = useNavigate()
  const [, setSelectedClient] = useState<ClientProfile | null>(null)

  const clientProfiles: Array<ClientProfile> = [
    {
      name: "Sarah Chen",
      age: 28,
      primaryIssue: "Anxiety and Work Stress",
      background: "Tech professional struggling with work-life balance",
      keyTraits: ["Perfectionist", "High-achieving", "Socially anxious"],
      complexity: "Moderate"
    },
    {
      name: "Marcus Johnson",
      age: 35,
      primaryIssue: "Depression and Relationship Issues",
      background: "Recently divorced, adjusting to single life",
      keyTraits: ["Introspective", "Creative", "Struggling with self-worth"],
      complexity: "High"
    }
  ]

  const handleClientSelect = (client: ClientProfile) => {
    setSelectedClient(client)
    // Store client context for chat
    localStorage.setItem('clientContext', JSON.stringify(client))
    navigate('/chat')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Select a Client Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clientProfiles.map((client, index) => (
          <div 
            key={index}
            className="border border-gray-700 rounded-lg p-6 hover:border-blue-500 cursor-pointer"
            onClick={() => handleClientSelect(client)}
          >
            <h2 className="text-xl font-semibold mb-2">{client.name}</h2>
            <p className="text-gray-400">Age: {client.age}</p>
            <p className="text-gray-400">Issue: {client.primaryIssue}</p>
            <p className="text-gray-400 mt-2">{client.background}</p>
            <div className="mt-4">
              {client.keyTraits.map((trait, i) => (
                <span key={i} className="inline-block bg-gray-800 rounded-full px-3 py-1 text-sm mr-2 mb-2">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClientSelection