import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { box, randomBytes } from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

interface Message {
  role: 'user' | 'assistant'
  content: string
  encrypted?: boolean
}

interface ClientContext {
  name: string
  age: number
  primaryIssue: string
  background: string
  keyTraits: Array<string>
  complexity: string
}

const Chat: React.FC = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Array<Message>>([])
  const [inputMessage, setInputMessage] = useState('')
  const [clientContext, setClientContext] = useState<ClientContext | null>(null)
  const [keyPair, setKeyPair] = useState<{ publicKey: Uint8Array; secretKey: Uint8Array } | null>(null)
  const [serverPublicKey, setServerPublicKey] = useState<Uint8Array | null>(null)

  useEffect(() => {
    const storedContext = localStorage.getItem('clientContext')
    if (!storedContext) {
      navigate('/select-client')
      return
    }
    setClientContext(JSON.parse(storedContext))
  }, [navigate])

  useEffect(() => {
    // Generate client keypair on component mount
    const newKeyPair = box.keyPair()
    setKeyPair(newKeyPair)
    
    // Exchange public keys with server
    fetchServerPublicKey(encodeBase64(newKeyPair.publicKey))
  }, [])

  const encryptMessage = (message: string): string => {
    if (!keyPair || !serverPublicKey) return message
    
    const ephemeralKeyPair = box.keyPair()
    const nonce = randomBytes(box.nonceLength)
    const encryptedMessage = box(
      decodeBase64(message),
      nonce,
      serverPublicKey,
      keyPair.secretKey
    )

    return encodeBase64(nonce) + '.' + encodeBase64(encryptedMessage)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const encryptedContent = encryptMessage(inputMessage)
    const newMessages = [...messages, { 
      role: 'user' as const, 
      content: inputMessage,
      encrypted: true 
    }]
    
    setMessages(newMessages)
    setInputMessage('')

    try {
      const response = await fetch('https://api.gemcity.xyz/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': keyPair ? encodeBase64(keyPair.publicKey) : ''
        },
        body: JSON.stringify({
          message: encryptedContent,
          clientContext,
          encrypted: true
        }),
      })

      const data = await response.json()
      // Decrypt server response here
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: data.response,
        encrypted: true 
      }])
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-4 h-[70vh] overflow-y-auto mb-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 ${
                msg.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 ml-auto'
                    : 'bg-gray-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-gray-800 rounded-lg p-3 text-white"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chat

const fetchServerPublicKey = async (clientPublicKey: string) => {
  try {
    const response = await fetch('https://api.gemcity.xyz/api/keys/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientPublicKey }),
    })
    const { serverPublicKey } = await response.json()
    return decodeBase64(serverPublicKey)
  } catch (error) {
    console.error('Error fetching server public key:', error)
    throw error
  }
}