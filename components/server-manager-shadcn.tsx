"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  MoreVertical,
  Plug,
  PlugZap,
  RefreshCw,
  Server,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMCPStore } from "@/lib/stores/mcp-store";
import { ServerStatus } from "@/lib/types/mcp";
import { cn } from "@/lib/utils";
import { ReconnectAllButton } from "./reconnect-all-button";

export function ServerManagerShadcn() {
  const { servers, addServer, removeServer, updateServerStatus } =
    useMCPStore();
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [loadingServers, setLoadingServers] = useState<Set<string>>(new Set());

  const toggleExpanded = (name: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleToolsExpanded = (name: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleReconnect = async (name: string) => {
    const server = servers.find((s) => s.name === name);
    if (!server) return;

    setLoadingServers((prev) => new Set(prev).add(name));
    updateServerStatus(name, ServerStatus.CONNECTING);

    try {
      // Check if this is a remote SSE server
      const isRemoteSSE =
        server.config?.type === "remote-sse" || server.config?.url;

      if (isRemoteSSE) {
        // For remote SSE servers, use the connect-sse endpoint
        const response = await fetch("/api/mcp/connect-sse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: server.name,
            url: server.config.url,
            authToken: server.config.authToken,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to reconnect");
        }

        const data = await response.json();
        addServer(data.server);
      } else {
        // For local servers, use the connect-v2 endpoint
        const response = await fetch("/api/mcp/connect-v2", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to reconnect");
        }

        const data = await response.json();
        addServer(data.server);
      }
    } catch (error) {
      updateServerStatus(
        name,
        ServerStatus.ERROR,
        error instanceof Error ? error.message : "Failed to reconnect",
      );
    } finally {
      setLoadingServers((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const handleConnect = async (name: string) => {
    const server = servers.find((s) => s.name === name);
    if (!server) return;

    setLoadingServers((prev) => new Set(prev).add(name));
    updateServerStatus(name, ServerStatus.CONNECTING);

    try {
      const response = await fetch("/api/mcp/connect-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          config: server.config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect");
      }

      const data = await response.json();
      addServer(data.server);
    } catch (error) {
      updateServerStatus(
        name,
        ServerStatus.ERROR,
        error instanceof Error ? error.message : "Failed to connect",
      );
    } finally {
      setLoadingServers((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const handleDisconnect = async (name: string) => {
    setLoadingServers((prev) => new Set(prev).add(name));

    try {
      const response = await fetch(
        `/api/mcp/connect-v2?name=${encodeURIComponent(name)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disconnect");
      }

      updateServerStatus(name, ServerStatus.DISCONNECTED);
    } catch (error) {
      console.error("Failed to disconnect:", error);
      updateServerStatus(
        name,
        ServerStatus.ERROR,
        error instanceof Error ? error.message : "Failed to disconnect",
      );
    } finally {
      setLoadingServers((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const handleRemove = async (name: string) => {
    const server = servers.find((s) => s.name === name);
    if (server && server.status === ServerStatus.CONNECTED) {
      await handleDisconnect(name);
    }
    removeServer(name);
  };

  const getStatusIcon = (status: ServerStatus, isLoading: boolean) => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    switch (status) {
      case ServerStatus.CONNECTED:
        return <PlugZap className="h-4 w-4 text-green-600" />;
      case ServerStatus.CONNECTING:
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case ServerStatus.DISCONNECTED:
        return <Plug className="h-4 w-4 text-muted-foreground" />;
      case ServerStatus.ERROR:
        return <XCircle className="h-4 w-4 text-destructive" />;
      case ServerStatus.PERMISSION_REQUIRED:
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <Server className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ServerStatus) => {
    const variants: Record<
      ServerStatus,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      [ServerStatus.CONNECTED]: "default",
      [ServerStatus.CONNECTING]: "secondary",
      [ServerStatus.DISCONNECTED]: "outline",
      [ServerStatus.ERROR]: "destructive",
      [ServerStatus.PERMISSION_REQUIRED]: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

  if (servers.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">MCP Servers</CardTitle>
          <CardDescription>No servers configured</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <Server className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Upload a configuration to add servers
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">MCP Servers</CardTitle>
          <ReconnectAllButton />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-4 pt-0">
            {servers.map((server) => {
              const isExpanded = expandedServers.has(server.name);
              const isLoading = loadingServers.has(server.name);

              return (
                <Collapsible
                  key={server.name}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(server.name)}
                >
                  <div className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>

                        {getStatusIcon(server.status, isLoading)}

                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {server.name}
                          </span>
                          {server.error && (
                            <span className="text-xs text-destructive">
                              {server.error}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(server.status)}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {server.status === ServerStatus.CONNECTED ? (
                              <DropdownMenuItem
                                onClick={() => handleDisconnect(server.name)}
                              >
                                <Plug className="mr-2 h-4 w-4" />
                                Disconnect
                              </DropdownMenuItem>
                            ) : server.status === ServerStatus.ERROR ? (
                              <DropdownMenuItem
                                onClick={() => handleReconnect(server.name)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reconnect
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleConnect(server.name)}
                              >
                                <PlugZap className="mr-2 h-4 w-4" />
                                Connect
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemove(server.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <CollapsibleContent>
                      {server.capabilities && (
                        <div className="border-t px-3 py-3 space-y-3">
                          {/* Tools */}
                          {server.capabilities.tools &&
                            server.capabilities.tools.length > 0 && (
                              <div>
                                <button
                                  onClick={() =>
                                    toggleToolsExpanded(server.name)
                                  }
                                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2 hover:text-foreground transition-colors w-full text-left"
                                >
                                  {expandedTools.has(server.name) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <Wrench className="h-3 w-3" />
                                  Tools ({server.capabilities.tools.length})
                                </button>
                                {expandedTools.has(server.name) && (
                                  <ScrollArea className="h-[200px] rounded-md border bg-muted/20 p-2">
                                    <div className="space-y-1">
                                      {server.capabilities.tools.map((tool) => (
                                        <div
                                          key={tool.name}
                                          className="group hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                                        >
                                          <div className="text-xs font-mono text-primary">
                                            {tool.name}
                                          </div>
                                          {tool.description && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                              <div className="break-words overflow-wrap-anywhere word-break">
                                                <ReactMarkdown
                                                  remarkPlugins={[remarkGfm]}
                                                  components={{
                                                    p: ({ children }) => (
                                                      <p className="break-words whitespace-pre-wrap">
                                                        {children}
                                                      </p>
                                                    ),
                                                    strong: ({ children }) => (
                                                      <strong className="font-semibold break-words">
                                                        {children}
                                                      </strong>
                                                    ),
                                                    code: ({ children }) => (
                                                      <code className="bg-background px-1 py-0.5 rounded break-all whitespace-pre-wrap">
                                                        {children}
                                                      </code>
                                                    ),
                                                    ul: ({ children }) => (
                                                      <ul className="list-disc pl-3">
                                                        {children}
                                                      </ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                      <ol className="list-decimal pl-3">
                                                        {children}
                                                      </ol>
                                                    ),
                                                    li: ({ children }) => (
                                                      <li className="mb-0.5 break-words">
                                                        {children}
                                                      </li>
                                                    ),
                                                    a: ({ children, href }) => (
                                                      <a
                                                        href={href}
                                                        className="text-primary hover:underline break-all"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                      >
                                                        {children}
                                                      </a>
                                                    ),
                                                  }}
                                                >
                                                  {tool.description}
                                                </ReactMarkdown>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            )}

                          {/* Resources */}
                          {server.capabilities.resources &&
                            server.capabilities.resources.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                                  <FileText className="h-3 w-3" />
                                  Resources (
                                  {server.capabilities.resources.length})
                                </div>
                              </div>
                            )}

                          {/* Prompts */}
                          {server.capabilities.prompts &&
                            server.capabilities.prompts.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                                  <MessageSquare className="h-3 w-3" />
                                  Prompts ({server.capabilities.prompts.length})
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
