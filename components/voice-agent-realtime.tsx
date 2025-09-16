"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Volume2, Bot, User, Wrench, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMCPStore } from "@/lib/stores/mcp-store";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VoiceMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  result?: any;
  status: "pending" | "executing" | "completed" | "error";
}

export function VoiceAgentRealtime() {
  const { servers } = useMCPStore();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // API key is now handled server-side, no client-side access needed
    setApiKey("server-managed"); // Placeholder to indicate server-side management
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (message: VoiceMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const updateLastAssistantMessage = (content: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastAssistantIndex = newMessages.findLastIndex(msg => msg.role === "assistant");

      if (lastAssistantIndex !== -1) {
        newMessages[lastAssistantIndex] = {
          ...newMessages[lastAssistantIndex],
          content
        };
      } else {
        // Create new assistant message if none exists
        newMessages.push({
          id: Date.now().toString(),
          role: "assistant",
          content,
          timestamp: new Date()
        });
      }

      return newMessages;
    });
  };



  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setMessages([]);

      // Create session on server side (secure - API key stays server-side)
      const response = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_session'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const sessionData = await response.json();
      console.log('Session created:', sessionData);

      setIsSessionActive(true);
      setIsConnecting(false);

      // Add initial system message
      addMessage({
        id: "system-start",
        role: "system",
        content: "Voice session started. You can now speak to the assistant.",
        timestamp: new Date()
      });

    } catch (err) {
      console.error("Failed to start session:", err);
      setError(err instanceof Error ? err.message : "Failed to start session");
      setIsConnecting(false);
    }
  };

  const endSession = async () => {
    console.log("Ending session");

    // Disconnect handled by component cleanup
    console.log("Session cleanup");

    setIsSessionActive(false);
    setIsAssistantSpeaking(false);
    setCurrentTranscript("");

    if (messages.length > 0) {
      addMessage({
        id: Date.now().toString(),
        role: "system",
        content: "Session ended.",
        timestamp: new Date()
      });
    }
  };

  const saveApiKey = () => {
    localStorage.setItem("openai_api_key", apiKey);
    setShowSettings(false);
    setError(null);
  };

  const totalTools = servers.filter(s => s.status === "connected").reduce(
    (acc, server) => acc + (server.capabilities?.tools?.length || 0),
    0
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Assistant (GPT-Realtime)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {totalTools} tools available
            </Badge>
            {isAssistantSpeaking && (
              <Badge variant="default" className="text-xs animate-pulse">
                <Volume2 className="h-3 w-3 mr-1" />
                Speaking
              </Badge>
            )}
            {isSessionActive && !isAssistantSpeaking && (
              <Badge variant="secondary" className="text-xs">
                <Mic className="h-3 w-3 mr-1" />
                Listening
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {showSettings && (
        <div className="p-4 border-b bg-muted/50">
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <Button size="sm" onClick={saveApiKey}>Save</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
        </div>
      )}

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm mb-2">
                Click Start Session to begin a voice conversation
              </p>
              <p className="text-xs text-muted-foreground">
                {totalTools > 0
                  ? `${totalTools} MCP tools are ready to use`
                  : "Connect MCP servers to enable tool usage"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role !== "user" && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === "assistant" ? "bg-primary/10" : "bg-muted"
                    )}>
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-2 max-w-[80%]",
                      message.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    {message.content && (
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.role === "assistant"
                            ? "bg-muted"
                            : "bg-muted/50 text-sm"
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Tool Calls */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="space-y-2 w-full">
                        {message.toolCalls.map((toolCall) => (
                          <div
                            key={toolCall.id}
                            className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1"
                          >
                            <Wrench className="h-3 w-3" />
                            <span className="font-medium">{toolCall.name}</span>
                            <Badge
                              variant={
                                toolCall.status === "completed"
                                  ? "default"
                                  : toolCall.status === "error"
                                  ? "destructive"
                                  : toolCall.status === "executing"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs h-4"
                            >
                              {toolCall.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Show current transcript being built */}
              {currentTranscript && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {currentTranscript}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mx-4 mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Control Buttons */}
        <div className="p-4 border-t bg-background">
          {!isSessionActive ? (
            <Button
              size="lg"
              className="w-full"
              onClick={startSession}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Start Session
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              onClick={endSession}
            >
              <MicOff className="mr-2 h-5 w-5" />
              End Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}