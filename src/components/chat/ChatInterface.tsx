import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const handleSend = async () => {
        if (!input.trim())
            return;
        const newMessage: Message = {
            id: Date.now().toString(),
            content: input,
            sender: 'user',
            timestamp: new Date().toISOString(),
            sessionId: 'current-session'
        };
        setMessages(prev => [...prev, newMessage]);
        setInput('');
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, newMessage].map((m: any) => ({
                        role: m.sender === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                })
            });
            if (!response.ok)
                throw new Error('Failed to send message');
            const reader = response.body?.getReader();
            if (!reader)
                throw new Error('No response stream');
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const text = new TextDecoder().decode(value);
                const lines = text.split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.content) {
                            setMessages(prev => {
                                const lastMessage = prev[prev.length - 1];
                                if (lastMessage?.sender === 'assistant') {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...lastMessage, content: lastMessage.content + data.content }
                                    ];
                                }
                                else {
                                    return [...prev, {
                                            id: Date.now().toString(),
                                            content: data.content,
                                            sender: 'assistant',
                                            timestamp: new Date().toISOString(),
                                            sessionId: 'current-session'
                                        }];
                                }
                            });
                        }
                    }
                    catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    };
    return (<Card className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message: any) => (<div key={message.id} className={`mb-4 p-3 rounded-lg ${message.sender === 'user'
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted'} max-w-[80%]`}>
            {message.content}
          </div>))}
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Input value={input} onChange={(e: unknown) => setInput(e.target.value)} onKeyPress={(e: unknown) => e.key === 'Enter' && handleSend()} placeholder="Type your message..." className="flex-1"/>
        <Button onClick={handleSend}>Send</Button>
      </div>
    </Card>);
}

import { Message } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const handleSend = async () => {
        if (!input.trim())
            return;
        const newMessage: Message = {
            id: Date.now().toString(),
            content: input,
            sender: 'user',
            timestamp: new Date().toISOString(),
            sessionId: 'current-session'
        };
        setMessages(prev => [...prev, newMessage]);
        setInput('');
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, newMessage].map((m: any) => ({
                        role: m.sender === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                })
            });
            if (!response.ok)
                throw new Error('Failed to send message');
            const reader = response.body?.getReader();
            if (!reader)
                throw new Error('No response stream');
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const text = new TextDecoder().decode(value);
                const lines = text.split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.content) {
                            setMessages(prev => {
                                const lastMessage = prev[prev.length - 1];
                                if (lastMessage?.sender === 'assistant') {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...lastMessage, content: lastMessage.content + data.content }
                                    ];
                                }
                                else {
                                    return [...prev, {
                                            id: Date.now().toString(),
                                            content: data.content,
                                            sender: 'assistant',
                                            timestamp: new Date().toISOString(),
                                            sessionId: 'current-session'
                                        }];
                                }
                            });
                        }
                    }
                    catch (e) {
                        console.error('Error parsing SSE:', e);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    };
    return (<Card className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message: any) => (<div key={message.id} className={`mb-4 p-3 rounded-lg ${message.sender === 'user'
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted'} max-w-[80%]`}>
            {message.content}
          </div>))}
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Input value={input} onChange={(e: unknown) => setInput(e.target.value)} onKeyPress={(e: unknown) => e.key === 'Enter' && handleSend()} placeholder="Type your message..." className="flex-1"/>
        <Button onClick={handleSend}>Send</Button>
      </div>
    </Card>);
}
