import { useState, useCallback, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatContainer } from "@/components/ChatContainer";
import { AuthPage } from "@/components/AuthPage";
import { SpacesSection } from "@/components/SpacesSection";
import { DiscoverSection } from "@/components/DiscoverSection";
import { ChatMode } from "@/components/ChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat, stopStream } from "@/services/chat";
import {
  getConversations,
  getConversation,
  deleteConversation as apiDeleteConversation,
} from "@/services/conversations";
import {
  VoiceChatRealtimeClient,
  VoiceChatEvent,
} from "@/services/voiceChatRealtime";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
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
    loginWithGoogle,
    loginWithApple,
    oauthError,
    clearOAuthError,
    uploadAvatar,
  } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingImages, setStreamingImages] = useState<
    Array<{ url: string; revised_prompt?: string }>
  >([]);
  const [streamingProgress, setStreamingProgress] = useState<string | null>(
    null
  );
  const [isSpacesView, setIsSpacesView] = useState(false);
  const [isDiscoverView, setIsDiscoverView] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeSpaceName, setActiveSpaceName] = useState<string | null>(null);

  // Voice chat state
  const voiceClientRef = useRef<VoiceChatRealtimeClient | null>(null);
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceTranscriptPreview, setVoiceTranscriptPreview] = useState("");

  const abortRef = useRef<(() => void) | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleStopStream = useCallback(async () => {
    let serverConversationId: string | undefined;

    // First, tell the server to stop the stream
    if (streamIdRef.current) {
      try {
        const result = await stopStream(streamIdRef.current);
        if (result.success && result.data?.conversationId) {
          serverConversationId = result.data.conversationId;
        }
      } catch (error) {
        console.error("Failed to stop stream on server:", error);
      }
      streamIdRef.current = null;
    }

    // Then abort the local fetch
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }

    // Save partial response to conversation if there's any content
    if (streamingContent.trim() && activeConversationId) {
      const partialMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: streamingContent.trim() + "\n\n*(Response stopped)*",
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId) {
            // Update conversation ID if server provided one (fixes "Conversation not found" error)
            const newId = serverConversationId || c.id;
            if (serverConversationId && c.id !== serverConversationId) {
              setActiveConversationId(serverConversationId);
            }
            return {
              ...c,
              id: newId,
              messages: [...c.messages, partialMessage],
            };
          }
          return c;
        })
      );
    } else if (
      serverConversationId &&
      activeConversationId &&
      activeConversationId !== serverConversationId
    ) {
      // Even without partial content, update the conversation ID if needed
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, id: serverConversationId! }
            : c
        )
      );
      setActiveConversationId(serverConversationId);
    }

    setIsStreaming(false);
    setStreamingContent("");
    setStreamingImages([]);
    setStreamingProgress(null);
    setIsLoading(false);
  }, [streamingContent, activeConversationId]);

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
                  metadata: msg.metadata,
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
    setStreamingImages([]);
    setStreamingProgress(null);
    setActiveConversationId(null);
    setActiveSpaceId(null);
    setActiveSpaceName(null);
    setIsSpacesView(false);
    setIsDiscoverView(false);
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
      setStreamingImages([]);
      setStreamingProgress(null);
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
    },
    []
  );

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
      setStreamingImages([]);
      setStreamingProgress(null);
      setActiveConversationId(null);
      setActiveSpaceId(spaceId);
      setActiveSpaceName(spaceName);
      setIsSpacesView(false);
      setSidebarOpen(false);
    },
    []
  );

  // Voice chat lifecycle & mapping to messages
  const ensureVoiceClient = useCallback(() => {
    if (!voiceClientRef.current) {
      voiceClientRef.current = new VoiceChatRealtimeClient({
        onEvent: (event: VoiceChatEvent) => {
          switch (event.type) {
            case "session.created":
              setVoiceStatus("Connected to voice assistant");
              break;
            case "user.speech_started":
              setVoiceStatus("Listening...");
              setIsLoading(true);
              setVoiceTranscriptPreview("");
              break;
            case "user.speech_stopped":
              setVoiceStatus("Thinking...");
              break;
            case "assistant.transcript_delta":
              setVoiceTranscriptPreview((prev) => prev + event.delta);
              break;
            case "assistant.transcript_complete": {
              const transcript = event.transcript.trim();
              if (!transcript) break;

              // User requested to NOT create a chat on the frontend for voice conversations.
              // The backend handles persistence, but we won't show it in the chat list immediately.

              setVoiceTranscriptPreview("");
              setVoiceStatus("Voice chat ready");
              setIsVoiceRecording(false);
              setIsVoiceConnecting(false);
              setIsLoading(false);
              break;
            }
            case "error":
              setVoiceStatus(event.message);
              setIsVoiceRecording(false);
              setIsVoiceConnecting(false);
              setIsLoading(false);
              // Don't close the session on error immediately, let user see the error
              break;
            default:
              break;
          }
        },
      });
    }
    return voiceClientRef.current;
  }, [activeConversationId]);

  const handleToggleVoice = useCallback(async () => {
    // If session is active, this button acts as "End Call"
    if (isVoiceSessionActive) {
      const client = voiceClientRef.current;
      if (client) {
        client.disconnect();
      }
      setIsVoiceSessionActive(false);
      setIsVoiceRecording(false);
      setIsVoiceConnecting(false);
      setVoiceStatus(null);
      return;
    }

    // Start new session
    const client = ensureVoiceClient();
    if (!client) return;

    setIsVoiceSessionActive(true);
    setIsVoiceConnecting(true);
    setVoiceStatus("Connecting...");

    try {
      await client.startRecording();
      setIsVoiceRecording(true);
      setIsVoiceConnecting(false);
    } catch {
      // Errors are surfaced via onEvent
      setIsVoiceRecording(false);
      setIsVoiceConnecting(false);
      // Keep session active to show error
    }
  }, [ensureVoiceClient, isVoiceSessionActive]);

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
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingImages([]);
      setStreamingProgress(null);

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
          onStreamId: (streamId) => {
            streamIdRef.current = streamId;
          },
          onChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          onImage: (image) => {
            setStreamingImages((prev) => [...prev, { url: image }]);
            setStreamingProgress(null); // Clear progress when image arrives
          },
          onProgress: (message) => {
            setStreamingProgress(message);
          },
          onDone: (fullResponse, serverConversationId, generatedImages) => {
            const assistantMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: fullResponse,
              metadata:
                generatedImages && generatedImages.length > 0
                  ? {
                      generatedImages: generatedImages,
                      hasImage: true,
                    }
                  : undefined,
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
            setIsStreaming(false);
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
            setIsStreaming(false);
            setStreamingContent("");
            abortRef.current = null;
          },
        }
      );

      abortRef.current = abort;
    },
    [activeConversationId, activeSpaceId]
  );

  const handleRegenerate = useCallback(
    (prompt: string) => {
      // Simply resend the prompt to generate a new response
      // This preserves the chat history and appends the new interaction
      handleSend(prompt);
    },
    [handleSend]
  );

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-32 h-32 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-float overflow-hidden">
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
      <AuthPage
        onLogin={login}
        onSignup={signup}
        onGoogleLogin={loginWithGoogle}
        onAppleLogin={loginWithApple}
        onUploadProfilePic={uploadAvatar}
        isLoading={authLoading}
        oauthError={oauthError}
        onClearOAuthError={clearOAuthError}
      />
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
        userAvatar={user?.avatar}
        onUploadAvatar={uploadAvatar}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isSpacesView={isSpacesView}
        onShowSpaces={() => {
          setIsSpacesView(true);
          setIsDiscoverView(false);
        }}
        onShowChat={() => {
          setIsSpacesView(false);
          setIsDiscoverView(false);
        }}
        onShowDiscover={() => {
          setIsDiscoverView(true);
          setIsSpacesView(false);
          setSidebarOpen(false);
        }}
      />
      <main className="main-content">
        {isDiscoverView ? (
          <DiscoverSection />
        ) : isSpacesView ? (
          <SpacesSection
            onOpenConversation={handleSelectConversation}
            onStartNewChatInSpace={handleNewChatInSpace}
            onBackToChat={() => setIsSpacesView(false)}
          />
        ) : (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            streamingContent={streamingContent || voiceTranscriptPreview}
            streamingImage={
              streamingImages.length > 0
                ? streamingImages[streamingImages.length - 1].url
                : null
            }
            streamingProgress={streamingProgress}
            spaceName={activeSpaceName ?? undefined}
            conversationTitle={activeConversation?.title}
            conversationId={activeConversationId}
            onSend={handleSend}
            onRegenerate={handleRegenerate}
            isStreaming={isStreaming}
            onStopStream={handleStopStream}
            onToggleVoice={handleToggleVoice}
            isVoiceRecording={isVoiceRecording}
            isVoiceConnecting={isVoiceConnecting}
            voiceStatus={voiceStatus ?? undefined}
            isVoiceSessionActive={isVoiceSessionActive}
          />
        )}
      </main>
    </div>
  );
}
