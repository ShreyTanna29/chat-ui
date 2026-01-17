import { useState, useCallback, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatContainer } from "@/components/ChatContainer";
import { AuthPage } from "@/components/AuthPage";
import { SpacesSection } from "@/components/SpacesSection";
import { ChatMode } from "@/components/ChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat } from "@/services/chat";
import {
  getConversations,
  getConversation,
  deleteConversation as apiDeleteConversation,
} from "@/services/conversations";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function App() {
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    login,
    signup,
    logout,
  } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isSpacesView, setIsSpacesView] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeSpaceName, setActiveSpaceName] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const messages = activeConversation?.messages || [];

  // Load conversations from API when authenticated
  useEffect(() => {
    const loadConversations = async () => {
      if (!isAuthenticated) return;

      const result = await getConversations();
      if (result.success && result.conversations) {
        const formattedConversations: Conversation[] = result.conversations.map(
          (conv) => ({
            id: conv.id,
            title: conv.title,
            date: conv.createdAt,
            messages:
              conv.messages?.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
              })) || [],
          })
        );
        setConversations(formattedConversations);
      }
    };

    loadConversations();
  }, [isAuthenticated]);

  // Load full conversation when selecting one
  const loadFullConversation = async (convId: string) => {
    const result = await getConversation(convId);
    if (result.success && result.conversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: result.conversation!.messages.map((msg) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                })),
              }
            : c
        )
      );
    }
  };

  const handleNewChat = useCallback(() => {
    // Cancel any ongoing stream
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setStreamingContent("");
    setActiveConversationId(null);
    setActiveSpaceId(null);
    setActiveSpaceName(null);
    setIsSpacesView(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback(
    async (id: string, spaceId?: string, spaceName?: string) => {
      // Cancel any ongoing stream
      if (abortRef.current) {
        abortRef.current();
        abortRef.current = null;
      }
      setStreamingContent("");
      setActiveConversationId(id);

      if (spaceId) {
        setActiveSpaceId(spaceId);
        setActiveSpaceName(spaceName ?? null);
      } else {
        setActiveSpaceId(null);
        setActiveSpaceName(null);
      }
      setIsSpacesView(false);
    setSidebarOpen(false);

    // Always load full conversation since the list API only returns partial messages
    await loadFullConversation(id);
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const result = await apiDeleteConversation(id);
      if (result.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      }
    },
    [activeConversationId]
  );

  const handleNewChatInSpace = useCallback(
    (spaceId: string, spaceName: string) => {
      if (abortRef.current) {
        abortRef.current();
        abortRef.current = null;
      }
      setStreamingContent("");
      setActiveConversationId(null);
      setActiveSpaceId(spaceId);
      setActiveSpaceName(spaceName);
      setIsSpacesView(false);
      setSidebarOpen(false);
    },
    []
  );

  const handleSend = useCallback(
    async (content: string, image?: File, document?: File, mode?: ChatMode) => {
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
      };

      let currentConversationId = activeConversationId;
      let isNewConversation = false;

      // If no active conversation, create a new one locally
      if (!currentConversationId) {
        isNewConversation = true;
        const newConversation: Conversation = {
          id: generateId(), // Temporary ID, will be replaced by server
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          date: new Date().toISOString(),
          messages: [userMessage],
        };
        setConversations((prev) => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        currentConversationId = newConversation.id;
      } else {
        // Add message to existing conversation
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversationId
              ? { ...c, messages: [...c.messages, userMessage] }
              : c
          )
        );
      }

      // Start streaming
      setIsLoading(true);
      setStreamingContent("");

      // For new conversations, don't send conversationId - let server create one
      // For existing conversations, send the actual ID (which should be the server's ID)
      const { abort } = await streamChat(
        {
          prompt: content,
          conversationId: isNewConversation ? undefined : currentConversationId,
          // Only send spaceId when creating a new conversation from within a space
          spaceId: isNewConversation ? activeSpaceId || undefined : undefined,
          image,
          document,
          // Only send thinkMode if "think" is selected, researchMode if "research" is selected
          // Don't send these flags if "quick" mode is selected (default behavior)
          thinkMode: mode === "think" ? true : undefined,
          researchMode: mode === "research" ? true : undefined,
        },
        {
          onChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          onDone: (fullResponse, serverConversationId) => {
            const assistantMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: fullResponse,
            };

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id === currentConversationId) {
                  // Update conversation ID if server provided one
                  const newId = serverConversationId || c.id;
                  if (serverConversationId && c.id !== serverConversationId) {
                    setActiveConversationId(serverConversationId);
                  }
                  return {
                    ...c,
                    id: newId,
                    messages: [...c.messages, assistantMessage],
                  };
                }
                return c;
              })
            );

            setIsLoading(false);
            setStreamingContent("");
            abortRef.current = null;
          },
          onError: (error) => {
            console.error("Chat error:", error);
            // Add error message
            const errorMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: `Sorry, I encountered an error: ${error}. Please try again.`,
            };

            setConversations((prev) =>
              prev.map((c) =>
                c.id === currentConversationId
                  ? { ...c, messages: [...c.messages, errorMessage] }
                  : c
              )
            );

            setIsLoading(false);
            setStreamingContent("");
            abortRef.current = null;
          },
        }
      );

      abortRef.current = abort;
    },
    [activeConversationId, activeSpaceId]
  );

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-float overflow-hidden">
          <img
            src="/logo.jpg"
            alt="Erudite Logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthPage onLogin={login} onSignup={signup} isLoading={authLoading} />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onLogout={logout}
        userName={user?.name || "User"}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isSpacesView={isSpacesView}
        onShowSpaces={() => setIsSpacesView(true)}
        onShowChat={() => setIsSpacesView(false)}
      />
      <main className="main-content">
        {isSpacesView ? (
          <SpacesSection
            onOpenConversation={handleSelectConversation}
            onStartNewChatInSpace={handleNewChatInSpace}
            onBackToChat={() => setIsSpacesView(false)}
          />
        ) : (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            streamingContent={streamingContent}
            spaceName={activeSpaceName ?? undefined}
            conversationTitle={activeConversation?.title}
            onSend={handleSend}
          />
        )}
      </main>
    </div>
  );
}
