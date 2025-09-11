'use client';

import { useState } from 'react';
import { useMCPStore } from '@/lib/stores/mcp-store';
import { X, Wrench, Search, Server } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToolsModal({ isOpen, onClose }: ToolsModalProps) {
  const { servers } = useMCPStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get all tools from connected servers
  const connectedServers = servers.filter(s => s.status === 'connected');
  const allTools: Array<{ serverName: string; tool: any }> = [];
  
  connectedServers.forEach(server => {
    if (server.capabilities?.tools) {
      server.capabilities.tools.forEach(tool => {
        allTools.push({ serverName: server.name, tool });
      });
    }
  });

  // Filter tools based on search and selected server
  const filteredTools = allTools.filter(({ serverName, tool }) => {
    const matchesSearch = searchQuery === '' || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesServer = selectedServer === null || serverName === selectedServer;
    
    return matchesSearch && matchesServer;
  });

  // Group tools by server
  const toolsByServer = filteredTools.reduce((acc, { serverName, tool }) => {
    if (!acc[serverName]) {
      acc[serverName] = [];
    }
    acc[serverName].push(tool);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary" />
            <div>
              <DialogTitle>Available MCP Tools</DialogTitle>
              <DialogDescription>
                {allTools.length} tools from {connectedServers.length} servers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="border-y px-6 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setSelectedServer(null)}
              variant={selectedServer === null ? 'default' : 'outline'}
              size="sm"
            >
              All Servers
            </Button>
            {connectedServers.map(server => (
              <Button
                key={server.name}
                onClick={() => setSelectedServer(server.name)}
                variant={selectedServer === server.name ? 'default' : 'outline'}
                size="sm"
              >
                {server.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Tools List */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-6">
            {Object.keys(toolsByServer).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tools found matching your criteria
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(toolsByServer).map(([serverName, tools]) => (
                  <div key={serverName}>
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold">{serverName}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {tools.length} tools
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3">
                      {tools.map((tool, index) => (
                        <div
                          key={`${serverName}-${tool.name}-${index}`}
                          className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                                  {tool.name}
                                </code>
                              </div>
                              {tool.description && (
                                <p className="text-sm text-muted-foreground mt-2">{tool.description}</p>
                              )}
                              {tool.inputSchema && (
                                <details className="mt-3">
                                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                    View Input Schema
                                  </summary>
                                  <pre className="mt-2 text-xs bg-background p-2 rounded border overflow-x-auto">
                                    {JSON.stringify(tool.inputSchema, null, 2)}
                                  </pre>
                                </details>
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

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-muted/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredTools.length} of {allTools.length} tools
            </span>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}