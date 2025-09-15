"use client";

import {
  AlertCircle,
  Bot,
  Brain,
  Loader2,
  Send,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMCPStore } from "@/lib/stores/mcp-store";
import type { ChatMessage } from "@/lib/types/mcp";
import { cn } from "@/lib/utils";
import { ToolsModal } from "./tools-modal";

export function ChatInterfaceShadcn() {
  const { messages, addMessage, isChatLoading, setChatLoading, servers } =
    useMCPStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const model = "claude-sonnet-4-20250514";

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleShowToolsModal = () => {
      setShowToolsModal(true);
    };

    window.addEventListener("showToolsModal", handleShowToolsModal);
    return () => {
      window.removeEventListener("showToolsModal", handleShowToolsModal);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setChatLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat-claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message.content || "",
        timestamp: new Date(),
        toolCalls: data.toolCalls,
        toolResults: data.toolResults,
      };

      addMessage(assistantMessage);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setChatLoading(false);
    }
  };

  const connectedServers = servers.filter((s) => s.status === "connected");
  const totalTools = connectedServers.reduce(
    (acc, server) => acc + (server.capabilities?.tools?.length || 0),
    0,
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Messages */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative mb-4">
                  <Brain className="h-12 w-12 text-muted-foreground/30" />
                  <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-primary animate-pulse" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {connectedServers.length === 0
                    ? "Upload your MCP Server JSON configuration (same format used for Claude Desktop) to start using the chat and send messages with MCP tools"
                    : `${totalTools} tools are ready to help you`}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      message.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={cn(
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary",
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : message.role === "tool" ? (
                          <Wrench className="h-4 w-4" />
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-1">
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2.5 max-w-full",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                pre: ({ children, ...props }) => (
                                  <pre
                                    className="bg-background/50 rounded-md p-3 overflow-x-auto"
                                    {...props}
                                  >
                                    {children}
                                  </pre>
                                ),
                                code: ({ className, children, ...props }) => {
                                  const match = /language-(\w+)/.exec(
                                    className || "",
                                  );
                                  return match ? (
                                    <code
                                      className="bg-background/50 rounded px-1 py-0.5 font-mono text-xs"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  ) : (
                                    <code
                                      className="bg-background/50 rounded px-1 py-0.5 font-mono text-xs"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 mb-2">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-4 mb-2">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="mb-1">{children}</li>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="text-lg font-bold mb-2">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-base font-bold mb-2">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-sm font-bold mb-2">
                                    {children}
                                  </h3>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic">
                                    {children}
                                  </blockquote>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                        )}
                      </div>

                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wrench className="h-3 w-3" />
                            <span className="font-medium">
                              Used {message.toolCalls.length} tool
                              {message.toolCalls.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="border-l-2 border-muted ml-1.5 pl-3 space-y-2">
                            {message.toolCalls.map(
                              (call: any, index: number) => (
                                <div
                                  key={call.id || index}
                                  className="space-y-1"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary/50" />
                                    <span className="font-mono text-xs">
                                      {call.name}
                                    </span>
                                  </div>
                                  {call.arguments && (
                                    <div className="ml-4 text-xs text-muted-foreground">
                                      {typeof call.arguments === "object" ? (
                                        Object.entries(call.arguments).map(
                                          ([key, value]) => (
                                            <div
                                              key={key}
                                              className="flex gap-2"
                                            >
                                              <span className="font-medium">
                                                {key}:
                                              </span>
                                              <span className="truncate">
                                                {String(value)}
                                              </span>
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        <span>{String(call.arguments)}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      <span className="text-xs text-muted-foreground px-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isChatLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary">
                    <Brain className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                connectedServers.length === 0
                  ? "Connect an MCP server to start..."
                  : "Type your message..."
              }
              disabled={isChatLoading || connectedServers.length === 0}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={
                !input.trim() || isChatLoading || connectedServers.length === 0
              }
              size="icon"
            >
              {isChatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>

        {/* Tools Modal */}
        <ToolsModal
          isOpen={showToolsModal}
          onClose={() => setShowToolsModal(false)}
        />
      </div>
    </TooltipProvider>
  );
}
