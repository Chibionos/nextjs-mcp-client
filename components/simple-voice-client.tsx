"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Volume2, Bot, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMCPStore } from "@/lib/stores/mcp-store";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    status: "pending" | "executing" | "completed" | "error";
  };
}

export function SimpleVoiceClient() {
  const { servers } = useMCPStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // MCP tool functions - map tool names with server prefixes
  const mcpToolFunctions = useRef<Record<string, (args: any) => Promise<any>>>(
    {},
  );

  useEffect(() => {
    console.log("[Voice Agent] Building tool function map...");

    // Build tool function map from available tools
    // We need to fetch tools and create execution functions
    fetch('/api/mcp/tools')
      .then(response => response.json())
      .then(data => {
        const toolFns: Record<string, (args: any) => Promise<any>> = {};
        const tools = data.tools || [];

        tools.forEach((tool: any) => {
          const fullToolName = tool.name;

          toolFns[fullToolName] = async (args: any) => {
            console.log("[Voice Agent] ==================== TOOL EXECUTION ====================");
            console.log(`[Voice Agent] Executing tool: ${fullToolName}`);
            console.log(`[Voice Agent] Arguments:`, JSON.stringify(args, null, 2));

            try {
              // Parse server and tool names
              const [serverName, ...toolNameParts] = fullToolName.split("__");
              const toolName = toolNameParts.join("__");

              // Call the tool through the execute API endpoint
              const response = await fetch('/api/mcp/execute-tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  toolName: toolName,
                  arguments: args,
                  serverName: serverName
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Tool execution failed');
              }

              const result = await response.json();
              console.log(`[Voice Agent] Tool ${fullToolName} execution successful`);
              console.log(`[Voice Agent] Result type:`, typeof result);
              console.log(`[Voice Agent] Result preview:`, JSON.stringify(result).substring(0, 500));
              console.log("[Voice Agent] ============================================================");
              return result;
            } catch (error) {
              console.error(`[Voice Agent] ❌ Tool ${fullToolName} execution failed:`, error);
              console.log("[Voice Agent] ============================================================");
              throw error;
            }
          };

          // Also store without prefix for fallback
          const shortName = fullToolName.split("__").slice(1).join("__");
          if (shortName) {
            toolFns[shortName] = toolFns[fullToolName];
          }
        });

        mcpToolFunctions.current = toolFns;
        console.log(`[Voice Agent] Tool function map built with ${Object.keys(toolFns).length} functions`);
        console.log("[Voice Agent] Available function names:", Object.keys(toolFns).slice(0, 10));
      })
      .catch(error => {
        console.error("[Voice Agent] Failed to build tool function map:", error);
      });
  }, [servers]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const updateTranscript = (text: string) => {
    setTranscript((prev) => prev + text);
  };

  const finalizeTranscript = (text: string, role: "user" | "assistant") => {
    if (text) {
      addMessage({
        id: Date.now().toString(),
        role,
        content: text,
        timestamp: new Date(),
      });
    }
    setTranscript("");
  };

  const configureSession = async () => {
    if (!dataChannelRef.current) return;

    console.log("[Voice Agent] Configuring session...");

    // Fetch tools from the server API (where MCP connections are managed)
    try {
      const response = await fetch('/api/mcp/tools');
      const data = await response.json();

      const tools = data.tools || [];
      const serverDescriptions = data.serverDescriptions || "";

      console.log("[Voice Agent] ==================== TOOLS AVAILABLE ====================");
      console.log("[Voice Agent] Total MCP tools available:", tools.length);
      console.log("[Voice Agent] Server descriptions:", serverDescriptions);

      if (data.connectedServers) {
        data.connectedServers.forEach((server: any) => {
          console.log(`[Voice Agent]   📦 ${server.name}: ${server.toolCount} tools`);
        });
      }

      // Log first few tools as examples
      tools.slice(0, 5).forEach((tool: any) => {
        console.log(`[Voice Agent]   - ${tool.name}: ${tool.description}`);
      });
      if (tools.length > 5) {
        console.log(`[Voice Agent]   ... and ${tools.length - 5} more tools`);
      }
      console.log("[Voice Agent] ============================================================");

      // Tools are already formatted from the API
      // No need to reformat them

      console.log("[Voice Agent] Formatted tools for OpenAI Realtime:", tools.length);
      console.log("[Voice Agent] Tool format example:", tools[0] || "No tools available");

      // Create comprehensive instructions
      interface Tool { name: string; description: string; }

      const systemInstructions = tools.length > 0
        ? `You are a helpful AI assistant with voice capabilities. Always respond in English.\n\n

You have access to ${tools.length} MCP tools from the following servers: ${serverDescriptions}.

Available tools include:
${tools.slice(0, 10).map((t: Tool) => `- ${t.name}: ${t.description}`).join('\n')}
${tools.length > 10 ? `\n...and ${tools.length - 10} more tools.` : ''}

When users ask you to perform tasks, check if there's an appropriate tool available and use it. Always explain what you're doing when using tools.`
        : "You are a helpful AI assistant with voice capabilities. Always respond in English. No MCP servers are currently connected. Tell the user they should connect MCP servers to enable tool usage.";

    // Create the session update event with proper structure
    const event = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: systemInstructions,
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        temperature: 0.8,
        max_response_output_tokens: 4096,
        tools: tools.length > 0 ? tools : [],
        tool_choice: tools.length > 0 ? "auto" : "none",
      },
    };

    console.log("[Voice Agent] Sending session.update with:", {
      modalities: event.session.modalities,
      toolCount: event.session.tools.length,
      tool_choice: event.session.tool_choice,
      hasInstructions: !!event.session.instructions,
      voice: event.session.voice,
    });

      // Send the session update
      try {
        dataChannelRef.current.send(JSON.stringify(event));
        console.log("[Voice Agent] ✅ Session configuration sent to OpenAI Realtime API");
        console.log("[Voice Agent] Tools configured:", tools.length > 0 ? "YES" : "NO");
      } catch (error) {
        console.error("[Voice Agent] ❌ Failed to send session configuration:", error);
      }

      // Send initial greeting with tool information after a delay
      setTimeout(() => {
        if (dataChannelRef.current?.readyState === "open") {
          const greetingInstructions = tools.length > 0
            ? `Greet the user warmly in English. Tell them you have access to ${tools.length} MCP tools from these servers: ${serverDescriptions}. Briefly mention 2-3 example capabilities you can help with based on the available tools. Be concise but informative.`
            : "Greet the user in English and let them know that no MCP servers are currently connected. They should connect MCP servers first to access tools.";

          const greetingEvent = {
            type: "response.create",
            response: {
              modalities: ["text", "audio"],
              instructions: greetingInstructions,
            },
          };

          console.log("[Voice Agent] Sending initial greeting request");
          dataChannelRef.current.send(JSON.stringify(greetingEvent));
        }
      }, 1000); // Increased delay to ensure session is fully configured
    } catch (error) {
      console.error("[Voice Agent] ❌ Failed to fetch or configure tools:", error);
    }
  };

  const handleDataChannelMessage = async (event: MessageEvent) => {
    const msg = JSON.parse(event.data);

    // Only log important messages, not deltas
    if (!msg.type.includes("delta") && !msg.type.includes("transcript.delta")) {
      console.log("[Voice Agent] Received message type:", msg.type);
    }

    switch (msg.type) {
      case "session.created":
        console.log("[Voice Agent] ✅ Session created successfully");
        console.log("[Voice Agent] Session details:", msg);
        console.log("[Voice Agent] Session ID:", msg.session?.id);
        console.log("[Voice Agent] Initial tools:", msg.session?.tools?.length || 0);

        // Configure session with MCP tools AFTER session is created
        console.log("[Voice Agent] Configuring session with MCP tools...");
        setTimeout(async () => {
          await configureSession();
        }, 100); // Small delay to ensure session is ready

        addMessage({
          id: Date.now().toString(),
          role: "system",
          content: "Connected. You can start speaking.",
          timestamp: new Date(),
        });
        break;

      case "session.updated":
        console.log("[Voice Agent] ✅ Session updated successfully");
        console.log("[Voice Agent] Updated session tools:", msg.session?.tools?.length || 0);
        if (msg.session?.tools?.length > 0) {
          console.log("[Voice Agent] Tools are now available to the AI");
        }
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (msg.transcript) {
          finalizeTranscript(msg.transcript, "user");
        }
        break;

      case "response.audio_transcript.delta":
        if (msg.delta) {
          updateTranscript(msg.delta);
        }
        break;

      case "response.audio_transcript.done":
        if (msg.transcript) {
          finalizeTranscript(msg.transcript, "assistant");
        }
        break;

      case "response.function_call_arguments.done":
        console.log("[Voice Agent] ==================== FUNCTION CALL REQUEST ====================");
        console.log("[Voice Agent] Function requested by AI:", msg.name);
        console.log("[Voice Agent] Call ID:", msg.call_id);
        console.log("[Voice Agent] Arguments received:", msg.arguments);

        // Handle function call
        const fn = mcpToolFunctions.current[msg.name];

        if (fn) {
          console.log(`[Voice Agent] ✅ Function found in registry`);

          // Extract display name (remove server prefix for display)
          const displayName = msg.name.includes("__")
            ? msg.name.split("__").slice(1).join("__")
            : msg.name;

          // Add tool call message
          const toolMessage: Message = {
            id: Date.now().toString(),
            role: "system",
            content: `Executing: ${displayName}`,
            timestamp: new Date(),
            toolCall: {
              name: displayName,
              status: "executing",
            },
          };
          addMessage(toolMessage);

          try {
            const args =
              typeof msg.arguments === "string"
                ? JSON.parse(msg.arguments)
                : msg.arguments;

            const result = await fn(args);
            console.log("[Voice Agent] Tool execution completed successfully");

            // Send result back
            const outputEvent = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: msg.call_id,
                output: JSON.stringify(result),
              },
            };
            console.log("[Voice Agent] Sending tool result back to AI:", {
              call_id: msg.call_id,
              resultLength: JSON.stringify(result).length,
            });
            dataChannelRef.current?.send(JSON.stringify(outputEvent));

            // Request response after tool execution
            setTimeout(() => {
              dataChannelRef.current?.send(
                JSON.stringify({ type: "response.create" }),
              );
            }, 100);

            // Update tool message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === toolMessage.id
                  ? { ...m, toolCall: { ...m.toolCall!, status: "completed" } }
                  : m,
              ),
            );
          } catch (error) {
            console.error("[Voice Agent] ❌ Tool execution error:", error);
            console.log("[Voice Agent] Error details:", {
              tool: msg.name,
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === toolMessage.id
                  ? {
                      ...m,
                      content: `Error executing ${displayName}: ${error instanceof Error ? error.message : "Unknown error"}`,
                      toolCall: { ...m.toolCall!, status: "error" },
                    }
                  : m,
              ),
            );
          }
        } else {
          console.error(`[Voice Agent] ❌ Tool not found: ${msg.name}`);
          console.log("[Voice Agent] Available tools:", Object.keys(mcpToolFunctions.current));
          console.log("[Voice Agent] ============================================================");
          addMessage({
            id: Date.now().toString(),
            role: "system",
            content: `Tool not found: ${msg.name}`,
            timestamp: new Date(),
            toolCall: {
              name: msg.name,
              status: "error",
            },
          });
        }
        break;

      case "error":
        console.error("[Voice Agent] ❌ Error received:", msg.error);
        setError(msg.error?.message || "An error occurred");
        break;
    }
  };

  const connect = async () => {
    try {
      console.log("[Voice Agent] Starting connection to OpenAI Realtime API...");
      setIsConnecting(true);
      setError(null);
      setMessages([]);

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Handle inbound audio
      pc.ontrack = (event) => {
        console.log("Received audio track");
        const audio = document.createElement("audio");
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.controls = false;
        audioElementRef.current = audio;
        // Add to page but keep hidden
        audio.style.display = "none";
        document.body.appendChild(audio);
      };

      // Create data channel
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;

      dataChannel.addEventListener("open", () => {
        console.log("[Voice Agent] ✅ Data channel opened");
        // Wait for session to be created before configuring
        // configureSession will be called after session.created event
      });

      dataChannel.addEventListener("message", handleDataChannelMessage);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Add microphone to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTransceiver(track, { direction: "sendrecv" });
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect to OpenAI Realtime API through our server endpoint
      const realtimeResponse = await fetch("/api/realtime/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sdp: offer.sdp,
        }),
      });

      if (!realtimeResponse.ok) {
        throw new Error("Failed to connect to Realtime API");
      }

      const answer = await realtimeResponse.text();

      // Set remote description
      await pc.setRemoteDescription({
        sdp: answer,
        type: "answer",
      });

      console.log("[Voice Agent] ✅ Successfully connected to OpenAI Realtime API");
      setIsConnected(true);
      setIsConnecting(false);
    } catch (error) {
      console.error("[Voice Agent] ❌ Connection error:", error);
      setError(error instanceof Error ? error.message : "Failed to connect");
      setIsConnecting(false);
      disconnect();
    }
  };

  const disconnect = () => {
    console.log("[Voice Agent] Disconnecting from OpenAI Realtime API...");
    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove audio element
    if (audioElementRef.current) {
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }

    setIsConnected(false);

    if (messages.length > 0) {
      addMessage({
        id: Date.now().toString(),
        role: "system",
        content: "Disconnected.",
        timestamp: new Date(),
      });
    }
  };

  const connectedServers = servers.filter((s) => s.status === "connected");
  const totalTools = connectedServers.reduce(
    (acc, server) => acc + (server.capabilities?.tools?.length || 0),
    0,
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">OpenAI Realtime Voice Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {connectedServers.length} servers
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalTools} tools
          </Badge>
          {isConnected && (
            <Badge variant="default" className="text-xs animate-pulse">
              <Mic className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm mb-2">
                Click Connect to start voice conversation
              </p>
              <p className="text-xs text-muted-foreground">
                {totalTools > 0
                  ? `${totalTools} MCP tools available`
                  : "Connect MCP servers to enable tools"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role !== "user" && (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === "assistant"
                          ? "bg-primary/10"
                          : "bg-muted",
                      )}
                    >
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : message.toolCall ? (
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col gap-1 max-w-[80%]",
                      message.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.role === "assistant"
                            ? "bg-muted"
                            : "bg-muted/50 text-sm",
                      )}
                    >
                      {message.content}
                      {message.toolCall && (
                        <Badge
                          variant={
                            message.toolCall.status === "completed"
                              ? "default"
                              : message.toolCall.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                          className="ml-2 text-xs"
                        >
                          {message.toolCall.status}
                        </Badge>
                      )}
                    </div>
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

              {/* Show current transcript */}
              {transcript && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-muted animate-pulse">
                    {transcript}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {error && (
          <Alert variant="destructive" className="mx-6 mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="px-6 py-4 border-t bg-background">
          {!isConnected ? (
            <Button
              size="lg"
              className="w-full"
              onClick={connect}
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
                  Connect
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              onClick={disconnect}
            >
              <MicOff className="mr-2 h-5 w-5" />
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
