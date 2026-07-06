import { useState, useRef, useEffect } from "react";
import { 
  useListChatConversations, 
  useCreateChatConversation, 
  useGetChatConversation, 
  useDeleteChatConversation,
  getListChatConversationsQueryKey,
  getGetChatConversationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquarePlus, Trash2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatTab() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: loadingConvos } = useListChatConversations();
  const createConvo = useCreateChatConversation();
  const deleteConvo = useDeleteChatConversation();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: activeConvo, isLoading: loadingMessages } = useGetChatConversation(activeId!, {
    query: {
      enabled: !!activeId,
      queryKey: getGetChatConversationQueryKey(activeId!)
    }
  });

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [activeConvo?.messages, streamingContent]);

  // Set activeId to newest if none selected
  useEffect(() => {
    if (!activeId && conversations.length > 0 && !loadingConvos) {
      const sorted = [...conversations].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActiveId(sorted[0].id);
    }
  }, [conversations, activeId, loadingConvos]);

  const handleCreate = () => {
    createConvo.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (newConvo) => {
        queryClient.invalidateQueries({ queryKey: getListChatConversationsQueryKey() });
        setActiveId(newConvo.id);
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteConvo.mutate({ id }, {
      onSuccess: () => {
        if (activeId === id) setActiveId(null);
        queryClient.invalidateQueries({ queryKey: getListChatConversationsQueryKey() });
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId || isStreaming) return;

    const messageContent = input.trim();
    setInput("");

    // Optimistically add user message to cache
    queryClient.setQueryData(getGetChatConversationQueryKey(activeId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, { id: Date.now(), role: 'user', content: messageContent }]
      };
    });

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines only; keep any incomplete trailing line in buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // last element may be incomplete

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                streamText += data.content;
                setStreamingContent(streamText);
              }
            } catch {
              // ignore partial/malformed SSE frames
            }
          }
        }
      }

      // Finish streaming, refresh to get actual DB record
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: getGetChatConversationQueryKey(activeId) });

    } catch (err) {
      console.error("Chat error", err);
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[500px] gap-6">
      
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col w-full md:w-1/3 md:max-w-[280px] gap-4 border-r md:pr-6 border-border/50",
        activeId !== null && "hidden md:flex"
      )}>
        <Button onClick={handleCreate} className="w-full gap-2 rounded-xl shadow-sm" variant="default">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {loadingConvos ? (
             [1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No conversations yet.
            </div>
          ) : (
            [...conversations]
              .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(convo => (
                <div 
                  key={convo.id}
                  onClick={() => setActiveId(convo.id)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                    activeId === convo.id 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="truncate text-sm pr-2">{convo.title || "Chat"}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => handleDelete(e, convo.id)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 -mr-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col h-[500px] md:h-auto",
        activeId === null && "hidden md:flex"
      )}>
        {activeId === null ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/20 rounded-3xl border border-dashed border-border/60 p-8">
            <Bot className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">AI Study Assistant</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-[250px]">Ask questions about your subjects, brainstorm essay topics, or review concepts.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-background rounded-3xl border border-border/60 overflow-hidden shadow-sm">
            <div className="md:hidden p-3 border-b flex items-center">
               <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>← Back</Button>
            </div>
            
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-6 max-w-2xl mx-auto pb-4">
                {loadingMessages && !activeConvo ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : activeConvo?.messages?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Send a message to start the conversation.
                  </div>
                ) : (
                  <>
                    {activeConvo?.messages.map((msg, i) => (
                      <div key={msg.id || i} className={cn(
                        "flex gap-4",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}>
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-primary text-primary-foreground rounded-tr-sm" 
                            : "bg-muted/50 text-foreground rounded-tl-sm border border-border/50"
                        )}>
                          {msg.role === 'user' ? (
                            msg.content
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isStreaming && (
                      <div className="flex gap-4 flex-row">
                        <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-muted/50 text-foreground rounded-tl-sm border border-border/50">
                          {streamingContent ? (
                            <div className="whitespace-pre-wrap">
                              {streamingContent}
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center h-5">
                              <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 bg-background border-t border-border/50">
              <form onSubmit={handleSend} className="relative max-w-2xl mx-auto flex items-center">
                <Input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="pr-12 bg-muted/30 border-border/60 py-6 rounded-2xl focus-visible:ring-primary/50"
                  disabled={isStreaming}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isStreaming}
                  className="absolute right-2 h-10 w-10 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
