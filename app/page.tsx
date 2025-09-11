'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Server, 
  Settings, 
  MessageSquare,
  Plug,
  Upload,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Code2,
  Globe,
  Database
} from 'lucide-react';
import { ChatInterfaceShadcn } from '@/components/chat-interface-shadcn';
import { ServerManagerShadcn } from '@/components/server-manager-shadcn';
import { ConfigUploaderShadcn } from '@/components/config-uploader-shadcn';
import { PermissionDialog } from '@/components/permission-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { useMCPStore } from '@/lib/stores/mcp-store';
import { cn } from '@/lib/utils';

export default function Home() {
  const { servers } = useMCPStore();
  const [activeTab, setActiveTab] = useState("chat");
  
  const connectedServers = servers.filter(s => s.status === 'connected');
  const totalTools = connectedServers.reduce((acc, server) => 
    acc + (server.capabilities?.tools?.length || 0), 0
  );

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-8 w-8 text-primary" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">MCP Client</h1>
              <p className="text-xs text-muted-foreground">Powered by Claude Sonnet</p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  {connectedServers.length > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
                <span className="font-medium">{connectedServers.length}</span>
                <span className="text-muted-foreground">servers</span>
              </div>
              
              <Separator orientation="vertical" className="h-4" />
              
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{totalTools}</span>
                <span className="text-muted-foreground">tools</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-4 max-w-[1600px] mx-auto w-full h-[calc(100vh-4rem)] overflow-hidden">
        <div className="grid gap-4 lg:grid-cols-[1fr_380px] h-full">
          {/* Chat Area - Left Side */}
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="border-b py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5" />
                    Chat with Claude
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Ask questions and use MCP tools to get things done
                  </CardDescription>
                </div>
                {connectedServers.length === 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <ChevronRight className="h-3 w-3" />
                    Connect a server to start
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ChatInterfaceShadcn />
            </CardContent>
          </Card>

          {/* Right Sidebar */}
          <div className="h-full flex flex-col gap-4 overflow-hidden">
            {/* Configuration Card */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Configuration</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={connectedServers.length > 0 ? "default" : "outline"} className="text-xs">
                      <Plug className="h-3 w-3 mr-1" />
                      {connectedServers.length}/{servers.length}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Code2 className="h-3 w-3 mr-1" />
                      {totalTools}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ConfigUploaderShadcn />
              </CardContent>
            </Card>
            
            {/* MCP Servers - Takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ServerManagerShadcn />
            </div>
          </div>
        </div>
      </main>

      {/* Permission Dialog */}
      <PermissionDialog />
    </div>
  );
}
