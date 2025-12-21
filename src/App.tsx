import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatContainer } from '@/components/ChatContainer'
import './App.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string
  date: string
  messages: Message[]
}

// Simulated AI responses
const aiResponses = [
  "I'd be happy to help you with that! Let me think about the best approach...\n\nBased on your question, here's what I suggest:\n\n1. First, consider the core requirements\n2. Break down the problem into smaller parts\n3. Implement each part systematically\n4. Test thoroughly as you go\n\nWould you like me to elaborate on any of these steps?",
  "That's a great question! Here's a comprehensive answer:\n\nThe key insight is understanding the underlying principles. Once you grasp those, everything else falls into place.\n\nLet me know if you need more specific guidance on any particular aspect.",
  "I understand what you're looking for. Here's my take:\n\nThere are several approaches you could take, each with their own trade-offs. The best choice depends on your specific context and constraints.\n\nWhat's most important to you - speed, simplicity, or flexibility?",
  "Interesting! Let me help you explore this further.\n\nFrom what I can see, you're on the right track. Here are a few suggestions to make it even better:\n\n• Consider edge cases carefully\n• Keep your code modular and reusable\n• Document your decisions for future reference\n\nDoes this help point you in the right direction?"
]

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function getRandomResponse() {
  return aiResponses[Math.floor(Math.random() * aiResponses.length)]
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null)
    setSidebarOpen(false)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setSidebarOpen(false)
  }, [])

  const handleSend = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content
    }

    // If no active conversation, create a new one
    if (!activeConversationId) {
      const newConversation: Conversation = {
        id: generateId(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        date: new Date().toISOString(),
        messages: [userMessage]
      }
      setConversations(prev => [newConversation, ...prev])
      setActiveConversationId(newConversation.id)
    } else {
      // Add message to existing conversation
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages, userMessage] }
          : c
      ))
    }

    // Simulate AI response
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500))

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: getRandomResponse()
    }

    setConversations(prev => prev.map(c => 
      c.id === (activeConversationId || prev[0]?.id)
        ? { ...c, messages: [...c.messages, assistantMessage] }
        : c
    ))
    setIsLoading(false)
  }, [activeConversationId])

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="main-content">
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
        />
      </main>
    </div>
  )
}
