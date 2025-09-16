"use client";

import {
  Brain,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  Github,
  Globe,
  MessageSquare,
  Mic,
  Plug,
  RefreshCw,
  Server,
  Settings,
  Sparkles,
  Star,
  Upload,
} from "lucide-react";
import React, { useState } from "react";
import { ChatInterfaceShadcn } from "@/components/chat-interface-shadcn";
import { ConfigUploaderShadcn } from "@/components/config-uploader-shadcn";
import { PermissionDialog } from "@/components/permission-dialog";
import { RemoteMCPLibrarySimple } from "@/components/remote-mcp-library-simple";
import { ServerManagerShadcn } from "@/components/server-manager-shadcn";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleVoiceClient } from "@/components/simple-voice-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMCPStore } from "@/lib/stores/mcp-store";
import { cn } from "@/lib/utils";

export default function Home() {
  const { servers } = useMCPStore();
  const [activeTab, setActiveTab] = useState("chat");
  const [githubStars, setGithubStars] = useState(1);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);

  const connectedServers = servers.filter((s) => s.status === "connected");
  const totalTools = connectedServers.reduce(
    (acc, server) => acc + (server.capabilities?.tools?.length || 0),
    0,
  );

  // Fetch GitHub stars on component mount
  React.useEffect(() => {
    fetch("https://api.github.com/repos/Chibionos/nextjs-mcp-client")
      .then((res) => res.json())
      .then((data) => setGithubStars(data.stargazers_count || 1))
      .catch(() => setGithubStars(1));
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className="h-6 w-6 text-primary" />
                <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-semibold">Simple MCP Client</h1>
                <p className="text-xs text-muted-foreground">
                  One message, one tool call, MCP execution
                </p>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="text-xs font-mono">
                claude-sonnet-4
              </Badge>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-7"
                onClick={() => {
                  // This will be handled by ChatInterfaceShadcn component
                  const event = new CustomEvent("showToolsModal");
                  window.dispatchEvent(event);
                }}
              >
                <Code2 className="h-3 w-3" />
                {totalTools} Tools
              </Button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-7"
              onClick={() =>
                window.open(
                  "https://github.com/Chibionos/nextjs-mcp-client",
                  "_blank",
                )
              }
            >
              <Github className="h-3 w-3" />
              <Star className="h-3 w-3" />
              {githubStars}
              <ExternalLink className="h-2 w-2" />
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-4 max-w-[1600px] mx-auto w-full h-[calc(100vh-4rem)] overflow-hidden">
        <div className="grid gap-4 lg:grid-cols-[1fr_380px] h-full">
          {/* Chat Area - Left Side */}
          <Card className="h-full flex flex-col overflow-hidden">
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
                    <Badge
                      variant={
                        connectedServers.length > 0 ? "default" : "outline"
                      }
                      className="text-xs"
                    >
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
              <CardContent className="space-y-3">
                <ConfigUploaderShadcn />
                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>
                <RemoteMCPLibrarySimple />
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

      {/* Voice Agent Dialog */}
      <Dialog open={showVoiceDialog} onOpenChange={setShowVoiceDialog}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>OpenAI Realtime Voice Assistant</DialogTitle>
          </DialogHeader>
          <SimpleVoiceClient />
        </DialogContent>
      </Dialog>

      {/* Talk Button - Fixed at bottom */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="lg"
          className="rounded-full h-14 px-6 shadow-lg"
          onClick={() => setShowVoiceDialog(true)}
        >
          <Mic className="mr-2 h-5 w-5" />
          Talk
        </Button>
      </div>
    </div>
  );
}
