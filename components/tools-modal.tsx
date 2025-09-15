"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Search,
  Server,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMCPStore } from "@/lib/stores/mcp-store";
import { cn } from "@/lib/utils";

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToolsModal({ isOpen, onClose }: ToolsModalProps) {
  const { servers } = useMCPStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(
    new Set(),
  );

  if (!isOpen) return null;

  // Get all tools, resources, and prompts from connected servers
  const connectedServers = servers.filter((s) => s.status === "connected");
  const allTools: Array<{ serverName: string; tool: any }> = [];
  const allResources: Array<{ serverName: string; resource: any }> = [];
  const allPrompts: Array<{ serverName: string; prompt: any }> = [];

  connectedServers.forEach((server) => {
    if (server.capabilities?.tools) {
      server.capabilities.tools.forEach((tool) => {
        allTools.push({ serverName: server.name, tool });
      });
    }
    if (server.capabilities?.resources) {
      server.capabilities.resources.forEach((resource) => {
        allResources.push({ serverName: server.name, resource });
      });
    }
    if (server.capabilities?.prompts) {
      server.capabilities.prompts.forEach((prompt) => {
        allPrompts.push({ serverName: server.name, prompt });
      });
    }
  });

  // Filter function for all types
  const filterItems = (items: any[], type: "tool" | "resource" | "prompt") => {
    return items.filter(({ serverName, [type]: item }) => {
      const matchesSearch =
        searchQuery === "" ||
        (item.name &&
          item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.uri &&
          item.uri.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesServer =
        selectedServer === null || serverName === selectedServer;

      return matchesSearch && matchesServer;
    });
  };

  // Group items by server
  const groupByServer = (items: any[], itemKey: string) => {
    return items.reduce(
      (acc, item) => {
        const serverName = item.serverName;
        if (!acc[serverName]) {
          acc[serverName] = [];
        }
        acc[serverName].push(item[itemKey]);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  };

  const filteredTools = filterItems(allTools, "tool");
  const filteredResources = filterItems(allResources, "resource");
  const filteredPrompts = filterItems(allPrompts, "prompt");

  const toolsByServer = groupByServer(filteredTools, "tool");
  const resourcesByServer = groupByServer(filteredResources, "resource");
  const promptsByServer = groupByServer(filteredPrompts, "prompt");

  const toggleSchema = (id: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary" />
            <div>
              <DialogTitle>MCP Server Capabilities</DialogTitle>
              <DialogDescription>
                {allTools.length} tools, {allResources.length} resources,{" "}
                {allPrompts.length} prompts from {connectedServers.length}{" "}
                servers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue="tools"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b px-6 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="tools" className="gap-2">
                <Wrench className="h-4 w-4" />
                Tools ({allTools.length})
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2">
                <FileText className="h-4 w-4" />
                Resources ({allResources.length})
              </TabsTrigger>
              <TabsTrigger value="prompts" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Prompts ({allPrompts.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filters */}
          <div className="border-b px-6 py-3 space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setSelectedServer(null)}
                variant={selectedServer === null ? "default" : "outline"}
                size="sm"
              >
                All Servers
              </Button>
              {connectedServers.map((server) => (
                <Button
                  key={server.name}
                  onClick={() => setSelectedServer(server.name)}
                  variant={
                    selectedServer === server.name ? "default" : "outline"
                  }
                  size="sm"
                >
                  {server.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Tools Tab */}
          <TabsContent value="tools" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-4">
                {Object.keys(toolsByServer).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tools found matching your criteria
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(Object.entries(toolsByServer) as [string, any[]][]).map(
                      ([serverName, tools]) => (
                        <div key={serverName}>
                          <div className="flex items-center gap-2 mb-3">
                            <Server className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold">{serverName}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {tools.length} tools
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {tools.map((tool, index) => {
                              const schemaId = `${serverName}-${tool.name}-${index}`;
                              const isExpanded = expandedSchemas.has(schemaId);

                              return (
                                <div
                                  key={schemaId}
                                  className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors overflow-hidden"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                                          {tool.name}
                                        </code>
                                      </div>
                                      {tool.description && (
                                        <div className="text-sm text-muted-foreground mt-2 overflow-hidden">
                                          <div className="break-words overflow-wrap-anywhere word-break">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={{
                                                p: ({ children }) => (
                                                  <p className="mb-2 last:mb-0 break-words whitespace-pre-wrap">
                                                    {children}
                                                  </p>
                                                ),
                                                strong: ({ children }) => (
                                                  <strong className="font-semibold break-words">
                                                    {children}
                                                  </strong>
                                                ),
                                                code: ({ children }) => (
                                                  <code className="bg-muted px-1 py-0.5 rounded text-xs break-all whitespace-pre-wrap">
                                                    {children}
                                                  </code>
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
                                                  <li className="mb-1 break-words">
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
                                      {tool.inputSchema && (
                                        <div className="mt-3">
                                          <button
                                            onClick={() =>
                                              toggleSchema(schemaId)
                                            }
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                            View Input Schema
                                          </button>
                                          {isExpanded && (
                                            <pre className="mt-2 text-xs bg-background p-3 rounded border overflow-auto max-h-64 whitespace-pre-wrap break-words">
                                              {JSON.stringify(
                                                tool.inputSchema,
                                                null,
                                                2,
                                              )}
                                            </pre>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-4">
                {Object.keys(resourcesByServer).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No resources available
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(
                      Object.entries(resourcesByServer) as [string, any[]][]
                    ).map(([serverName, resources]) => (
                      <div key={serverName}>
                        <div className="flex items-center gap-2 mb-3">
                          <Server className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-semibold">{serverName}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {resources.length} resources
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {resources.map((resource, index) => (
                            <div
                              key={`${serverName}-resource-${index}`}
                              className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors overflow-hidden"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {resource.name || resource.uri}
                                    </span>
                                  </div>
                                  {resource.uri && (
                                    <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded block break-all">
                                      {resource.uri}
                                    </code>
                                  )}
                                  {resource.description && (
                                    <div className="text-sm text-muted-foreground mt-2 overflow-hidden">
                                      <div className="break-words overflow-wrap-anywhere word-break">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                          components={{
                                            p: ({ children }) => (
                                              <p className="mb-2 last:mb-0 break-words whitespace-pre-wrap">
                                                {children}
                                              </p>
                                            ),
                                            strong: ({ children }) => (
                                              <strong className="font-semibold break-words">
                                                {children}
                                              </strong>
                                            ),
                                            code: ({ children }) => (
                                              <code className="bg-muted px-1 py-0.5 rounded text-xs break-all whitespace-pre-wrap">
                                                {children}
                                              </code>
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
                                              <li className="mb-1 break-words">
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
                                          {resource.description}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  )}
                                  {resource.mimeType && (
                                    <Badge
                                      variant="outline"
                                      className="mt-2 text-xs"
                                    >
                                      {resource.mimeType}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-4">
                {Object.keys(promptsByServer).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No prompts available
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(Object.entries(promptsByServer) as [string, any[]][]).map(
                      ([serverName, prompts]) => (
                        <div key={serverName}>
                          <div className="flex items-center gap-2 mb-3">
                            <Server className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold">{serverName}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {prompts.length} prompts
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {prompts.map((prompt, index) => {
                              const promptId = `${serverName}-prompt-${index}`;
                              const isExpanded = expandedSchemas.has(promptId);

                              return (
                                <div
                                  key={promptId}
                                  className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors overflow-hidden"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                          {prompt.name}
                                        </span>
                                      </div>
                                      {prompt.description && (
                                        <div className="text-sm text-muted-foreground overflow-hidden">
                                          <div className="break-words overflow-wrap-anywhere word-break">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={{
                                                p: ({ children }) => (
                                                  <p className="mb-2 last:mb-0 break-words whitespace-pre-wrap">
                                                    {children}
                                                  </p>
                                                ),
                                                strong: ({ children }) => (
                                                  <strong className="font-semibold break-words">
                                                    {children}
                                                  </strong>
                                                ),
                                                code: ({ children }) => (
                                                  <code className="bg-muted px-1 py-0.5 rounded text-xs break-all whitespace-pre-wrap">
                                                    {children}
                                                  </code>
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
                                                  <li className="mb-1 break-words">
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
                                              {prompt.description}
                                            </ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                      {prompt.arguments &&
                                        prompt.arguments.length > 0 && (
                                          <div className="mt-3">
                                            <button
                                              onClick={() =>
                                                toggleSchema(promptId)
                                              }
                                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                              {isExpanded ? (
                                                <ChevronDown className="h-3 w-3" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3" />
                                              )}
                                              View Arguments (
                                              {prompt.arguments.length})
                                            </button>
                                            {isExpanded && (
                                              <div className="mt-2 space-y-2">
                                                {prompt.arguments.map(
                                                  (
                                                    arg: any,
                                                    argIndex: number,
                                                  ) => (
                                                    <div
                                                      key={argIndex}
                                                      className="bg-background p-2 rounded text-xs"
                                                    >
                                                      <div className="font-mono font-medium">
                                                        {arg.name}
                                                      </div>
                                                      {arg.description && (
                                                        <div className="text-muted-foreground mt-1">
                                                          <div className="break-words overflow-wrap-anywhere word-break">
                                                            <ReactMarkdown
                                                              remarkPlugins={[
                                                                remarkGfm,
                                                              ]}
                                                              components={{
                                                                p: ({
                                                                  children,
                                                                }) => (
                                                                  <p className="break-words whitespace-pre-wrap">
                                                                    {children}
                                                                  </p>
                                                                ),
                                                                strong: ({
                                                                  children,
                                                                }) => (
                                                                  <strong className="font-semibold break-words">
                                                                    {children}
                                                                  </strong>
                                                                ),
                                                                code: ({
                                                                  children,
                                                                }) => (
                                                                  <code className="bg-muted px-1 py-0.5 rounded text-xs break-all whitespace-pre-wrap">
                                                                    {children}
                                                                  </code>
                                                                ),
                                                              }}
                                                            >
                                                              {arg.description}
                                                            </ReactMarkdown>
                                                          </div>
                                                        </div>
                                                      )}
                                                      {arg.required && (
                                                        <Badge
                                                          variant="destructive"
                                                          className="mt-1 text-xs"
                                                        >
                                                          Required
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing{" "}
              {filteredTools.length +
                filteredResources.length +
                filteredPrompts.length}{" "}
              items
            </span>
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
