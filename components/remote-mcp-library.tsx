"use client";

import {
  AlertCircle,
  Check,
  ChevronRight,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMCPStore } from "@/lib/stores/mcp-store";
import { type MCPServerConfig, ServerStatus } from "@/lib/types/mcp";

interface RemoteMCPServer {
  name: string;
  category: string;
  url: string;
  authentication: "OAuth2.1" | "OAuth2.1 🔐" | "API Key" | "Open";
  maintainer: string;
  description?: string;
}

const remoteMCPServers: RemoteMCPServer[] = [
  // OAuth2.1 Servers
  {
    name: "Asana",
    category: "Project Management",
    url: "https://mcp.asana.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Asana",
  },
  {
    name: "Audioscrape",
    category: "RAG-as-a-Service",
    url: "https://mcp.audioscrape.com",
    authentication: "OAuth2.1",
    maintainer: "Audioscrape",
  },
  {
    name: "Atlassian",
    category: "Software Development",
    url: "https://mcp.atlassian.com/v1/sse",
    authentication: "OAuth2.1 🔐",
    maintainer: "Atlassian",
  },
  {
    name: "Box",
    category: "Document Management",
    url: "https://mcp.box.com",
    authentication: "OAuth2.1 🔐",
    maintainer: "Box",
  },
  {
    name: "Buildkite",
    category: "Software Development",
    url: "https://mcp.buildkite.com/mcp",
    authentication: "OAuth2.1",
    maintainer: "Buildkite",
  },
  {
    name: "Canva",
    category: "Design",
    url: "https://mcp.canva.com/mcp",
    authentication: "OAuth2.1",
    maintainer: "Canva",
  },
  {
    name: "Carbon Voice",
    category: "Productivity",
    url: "https://mcp.carbonvoice.app",
    authentication: "OAuth2.1",
    maintainer: "Carbon Voice",
  },
  {
    name: "Cloudflare Workers",
    category: "Software Development",
    url: "https://bindings.mcp.cloudflare.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Cloudflare",
  },
  {
    name: "Cloudflare Observability",
    category: "Observability",
    url: "https://observability.mcp.cloudflare.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Cloudflare",
  },
  {
    name: "Cloudinary",
    category: "Asset Management",
    url: "https://asset-management.mcp.cloudinary.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Cloudinary",
  },
  {
    name: "Dialer",
    category: "Outbound Phone Calls",
    url: "https://getdialer.app/sse",
    authentication: "OAuth2.1",
    maintainer: "Dialer",
  },
  {
    name: "Egnyte",
    category: "Document Management",
    url: "https://mcp-server.egnyte.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Egnyte",
  },
  {
    name: "Firefly",
    category: "Productivity",
    url: "https://api.fireflies.ai/mcp",
    authentication: "OAuth2.1",
    maintainer: "Firefly",
  },
  {
    name: "GitHub",
    category: "Software Development",
    url: "https://api.githubcopilot.com/mcp",
    authentication: "OAuth2.1 🔐",
    maintainer: "GitHub",
  },
  {
    name: "Globalping",
    category: "Software Development",
    url: "https://mcp.globalping.dev/sse",
    authentication: "OAuth2.1",
    maintainer: "Globalping",
  },
  {
    name: "Grafbase",
    category: "Software Development",
    url: "https://api.grafbase.com/mcp",
    authentication: "OAuth2.1",
    maintainer: "Grafbase",
  },
  {
    name: "Hive Intelligence",
    category: "Crypto",
    url: "https://hiveintelligence.xyz/mcp",
    authentication: "OAuth2.1",
    maintainer: "Hive Intelligence",
  },
  {
    name: "Instant",
    category: "Software Development",
    url: "https://mcp.instantdb.com/mcp",
    authentication: "OAuth2.1",
    maintainer: "Instant",
  },
  {
    name: "Intercom",
    category: "Customer Support",
    url: "https://mcp.intercom.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Intercom",
  },
  {
    name: "Invidio",
    category: "Video Platform",
    url: "https://mcp.invideo.io/sse",
    authentication: "OAuth2.1",
    maintainer: "Invidio",
  },
  {
    name: "Jam",
    category: "Software Development",
    url: "https://mcp.jam.dev/mcp",
    authentication: "OAuth2.1",
    maintainer: "Jam.dev",
  },
  {
    name: "Kollektiv",
    category: "Documentation",
    url: "https://mcp.thekollektiv.ai/sse",
    authentication: "OAuth2.1",
    maintainer: "Kollektiv",
  },
  {
    name: "Linear",
    category: "Project Management",
    url: "https://mcp.linear.app/sse",
    authentication: "OAuth2.1",
    maintainer: "Linear",
  },
  {
    name: "Listenetic",
    category: "Productivity",
    url: "https://mcp.listenetic.com/v1/mcp",
    authentication: "OAuth2.1",
    maintainer: "Listenetic",
  },
  {
    name: "Meta Ads by Pipeboard",
    category: "Advertising",
    url: "https://mcp.pipeboard.co/meta-ads-mcp",
    authentication: "OAuth2.1",
    maintainer: "Pipeboard",
  },
  {
    name: "monday.com",
    category: "Productivity",
    url: "https://mcp.monday.com/sse",
    authentication: "OAuth2.1",
    maintainer: "monday MCP",
  },
  {
    name: "Neon",
    category: "Software Development",
    url: "https://mcp.neon.tech/sse",
    authentication: "OAuth2.1",
    maintainer: "Neon",
  },
  {
    name: "Netlify",
    category: "Software Development",
    url: "https://netlify-mcp.netlify.app/mcp",
    authentication: "OAuth2.1",
    maintainer: "Netlify",
  },
  {
    name: "Notion",
    category: "Project Management",
    url: "https://mcp.notion.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Notion",
  },
  {
    name: "Octagon",
    category: "Market Intelligence",
    url: "https://mcp.octagonagents.com/mcp",
    authentication: "OAuth2.1",
    maintainer: "Octagon",
  },
  {
    name: "OneContext",
    category: "RAG-as-a-Service",
    url: "https://rag-mcp-2.whatsmcp.workers.dev/sse",
    authentication: "OAuth2.1",
    maintainer: "OneContext",
  },
  {
    name: "PayPal",
    category: "Payments",
    url: "https://mcp.paypal.com/sse",
    authentication: "OAuth2.1",
    maintainer: "PayPal",
  },
  {
    name: "Plaid",
    category: "Payments",
    url: "https://api.dashboard.plaid.com/mcp/sse",
    authentication: "OAuth2.1 🔐",
    maintainer: "Plaid",
  },
  {
    name: "Prisma Postgres",
    category: "Database",
    url: "https://mcp.prisma.io/mcp",
    authentication: "OAuth2.1",
    maintainer: "Prisma Postgres",
  },
  {
    name: "Rube",
    category: "Other",
    url: "https://rube.app/mcp",
    authentication: "OAuth2.1",
    maintainer: "Composio",
  },
  {
    name: "Scorecard",
    category: "AI Evaluation",
    url: "https://scorecard-mcp.dare-d5b.workers.dev/sse",
    authentication: "OAuth2.1",
    maintainer: "Scorecard",
  },
  {
    name: "Sentry",
    category: "Software Development",
    url: "https://mcp.sentry.dev/sse",
    authentication: "OAuth2.1",
    maintainer: "Sentry",
  },
  {
    name: "Stripe",
    category: "Payments",
    url: "https://mcp.stripe.com/",
    authentication: "OAuth2.1",
    maintainer: "Stripe",
  },
  {
    name: "Stytch",
    category: "Authentication",
    url: "http://mcp.stytch.dev/mcp",
    authentication: "OAuth2.1",
    maintainer: "Stytch",
  },
  {
    name: "Square",
    category: "Payments",
    url: "https://mcp.squareup.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Square",
  },
  {
    name: "Turkish Airlines",
    category: "Airlines",
    url: "https://mcp.turkishtechlab.com/mcp",
    authentication: "OAuth2.1",
    maintainer: "Turkish Technology",
  },
  {
    name: "Vercel",
    category: "Software Development",
    url: "https://mcp.vercel.com/",
    authentication: "OAuth2.1",
    maintainer: "Vercel",
  },
  {
    name: "Webflow",
    category: "CMS",
    url: "https://mcp.webflow.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Webflow",
  },
  {
    name: "Wix",
    category: "CMS",
    url: "https://mcp.wix.com/sse",
    authentication: "OAuth2.1",
    maintainer: "Wix",
  },
  {
    name: "Simplescraper",
    category: "Web Scraping",
    url: "https://mcp.simplescraper.io/mcp",
    authentication: "OAuth2.1",
    maintainer: "Simplescraper",
  },
  {
    name: "WayStation",
    category: "Productivity",
    url: "https://waystation.ai/mcp",
    authentication: "OAuth2.1",
    maintainer: "WayStation",
  },
  {
    name: "Zenable",
    category: "Security",
    url: "https://mcp.www.zenable.app/",
    authentication: "OAuth2.1",
    maintainer: "Zenable",
  },
  {
    name: "Zine",
    category: "Memory",
    url: "https://www.zine.ai/mcp",
    authentication: "OAuth2.1",
    maintainer: "Zine",
  },

  // Open Authentication Servers
  {
    name: "Cloudflare Docs",
    category: "Documentation",
    url: "https://docs.mcp.cloudflare.com/sse",
    authentication: "Open",
    maintainer: "Cloudflare",
  },
  {
    name: "Astro Docs",
    category: "Documentation",
    url: "https://mcp.docs.astro.build/mcp",
    authentication: "Open",
    maintainer: "Astro",
  },
  {
    name: "DeepWiki",
    category: "RAG-as-a-Service",
    url: "https://mcp.deepwiki.com/sse",
    authentication: "Open",
    maintainer: "Devin",
  },
  {
    name: "Find-A-Domain",
    category: "Productivity",
    url: "https://api.findadomain.dev/mcp",
    authentication: "Open",
    maintainer: "Find-A-Domain",
  },
  {
    name: "Hugging Face",
    category: "Software Development",
    url: "https://hf.co/mcp",
    authentication: "Open",
    maintainer: "Hugging Face",
  },
  {
    name: "Semgrep",
    category: "Software Development",
    url: "https://mcp.semgrep.ai/sse",
    authentication: "Open",
    maintainer: "Semgrep",
  },
  {
    name: "Remote MCP",
    category: "MCP Directory",
    url: "https://mcp.remote-mcp.com",
    authentication: "Open",
    maintainer: "Remote MCP",
  },
  {
    name: "OpenMesh",
    category: "Service Discovery",
    url: "https://api.openmesh.dev/mcp",
    authentication: "Open",
    maintainer: "OpenMesh",
  },
  {
    name: "OpenZeppelin Cairo",
    category: "Software Development",
    url: "https://mcp.openzeppelin.com/contracts/cairo/mcp",
    authentication: "Open",
    maintainer: "OpenZeppelin",
  },
  {
    name: "OpenZeppelin Solidity",
    category: "Software Development",
    url: "https://mcp.openzeppelin.com/contracts/solidity/mcp",
    authentication: "Open",
    maintainer: "OpenZeppelin",
  },
  {
    name: "OpenZeppelin Stellar",
    category: "Software Development",
    url: "https://mcp.openzeppelin.com/contracts/stellar/mcp",
    authentication: "Open",
    maintainer: "OpenZeppelin",
  },
  {
    name: "OpenZeppelin Stylus",
    category: "Software Development",
    url: "https://mcp.openzeppelin.com/contracts/stylus/mcp",
    authentication: "Open",
    maintainer: "OpenZeppelin",
  },
  {
    name: "LLM Text",
    category: "Data Analysis",
    url: "https://mcp.llmtxt.dev/sse",
    authentication: "Open",
    maintainer: "LLM Text",
  },
  {
    name: "GitMCP",
    category: "Software Development",
    url: "https://gitmcp.io/docs",
    authentication: "Open",
    maintainer: "GitMCP",
  },
  {
    name: "Manifold",
    category: "Forecasting",
    url: "https://api.manifold.markets/v0/mcp",
    authentication: "Open",
    maintainer: "Manifold",
  },
  {
    name: "Javadocs",
    category: "Software Development",
    url: "https://www.javadocs.dev/mcp",
    authentication: "Open",
    maintainer: "Javadocs.dev",
  },

  // API Key Authentication Servers
  {
    name: "Close",
    category: "CRM",
    url: "https://mcp.close.com/mcp",
    authentication: "API Key",
    maintainer: "Close",
  },
  {
    name: "HubSpot",
    category: "CRM",
    url: "https://app.hubspot.com/mcp/v1/http",
    authentication: "API Key",
    maintainer: "HubSpot",
  },
  {
    name: "Needle",
    category: "RAG-as-a-service",
    url: "https://mcp.needle-ai.com/mcp",
    authentication: "API Key",
    maintainer: "Needle",
  },
  {
    name: "Zapier",
    category: "Automation",
    url: "https://mcp.zapier.com/api/mcp/mcp",
    authentication: "API Key",
    maintainer: "Zapier",
  },
  {
    name: "Apify",
    category: "Web Data Extraction",
    url: "https://mcp.apify.com",
    authentication: "API Key",
    maintainer: "Apify",
  },
  {
    name: "Dappier",
    category: "RAG-as-a-Service",
    url: "https://mcp.dappier.com/mcp",
    authentication: "API Key",
    maintainer: "Dappier",
  },
  {
    name: "Mercado Libre",
    category: "E-Commerce",
    url: "https://mcp.mercadolibre.com/mcp",
    authentication: "API Key",
    maintainer: "Mercado Libre",
  },
  {
    name: "Mercado Pago",
    category: "Payments",
    url: "https://mcp.mercadopago.com/mcp",
    authentication: "API Key",
    maintainer: "Mercado Pago",
  },
  {
    name: "Short.io",
    category: "Link shortener",
    url: "https://ai-assistant.short.io/mcp",
    authentication: "API Key",
    maintainer: "Short.io",
  },
  {
    name: "Telnyx",
    category: "Communication",
    url: "https://api.telnyx.com/v2/mcp",
    authentication: "API Key",
    maintainer: "Telnyx",
  },
  {
    name: "Dodo Payments",
    category: "Payments",
    url: "https://mcp.dodopayments.com/sse",
    authentication: "API Key",
    maintainer: "Dodo Payments",
  },
  {
    name: "Polar Signals",
    category: "Software Development",
    url: "https://api.polarsignals.com/api/mcp/",
    authentication: "API Key",
    maintainer: "Polar Signals",
  },
];

interface RemoteMCPLibraryProps {
  onAddServer?: (server: RemoteMCPServer) => void;
}

export function RemoteMCPLibrary({ onAddServer }: RemoteMCPLibraryProps) {
  const { servers, addServer, removeServer } = useMCPStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedServer, setSelectedServer] = useState<RemoteMCPServer | null>(
    null,
  );

  const categories = [
    "all",
    ...Array.from(new Set(remoteMCPServers.map((s) => s.category))),
  ].sort();

  const filteredServers = remoteMCPServers.filter((server) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      server.name.toLowerCase().includes(searchLower) ||
      server.category.toLowerCase().includes(searchLower) ||
      server.maintainer.toLowerCase().includes(searchLower) ||
      server.url.toLowerCase().includes(searchLower);
    const matchesCategory =
      selectedCategory === "all" || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getAuthBadgeVariant = (auth: string) => {
    if (auth.includes("OAuth")) return "default";
    if (auth === "API Key") return "secondary";
    return "outline";
  };

  const getAuthIcon = (auth: string) => {
    if (auth.includes("OAuth")) return <Shield className="h-3 w-3" />;
    if (auth === "API Key") return <Key className="h-3 w-3" />;
    return <Globe className="h-3 w-3" />;
  };

  const handleAddServer = async (server: RemoteMCPServer) => {
    setSelectedServer(server);

    // Check if server already exists
    if (servers.find((s) => s.name === server.name)) {
      toast.error(`Server "${server.name}" is already added`);
      return;
    }

    // Check for servers that require pre-registration
    if (server.authentication === "OAuth2.1 🔐") {
      toast.warning(
        `${server.name} requires pre-registration. You need to register your app with ${server.maintainer} first and configure OAuth credentials.`,
        { duration: 5000 },
      );
      return;
    }

    // For API Key servers, show API key input dialog
    if (server.authentication === "API Key") {
      // We'll handle this in a modal
      return;
    }

    // All other servers can be connected
    await connectWithMcpRemote(server);
  };

  const connectWithMcpRemote = async (server: RemoteMCPServer) => {
    setIsConnecting(true);

    try {
      // ALL servers use mcp-remote for proper OAuth handling
      // Let mcp-remote auto-select a port to avoid conflicts
      // Do NOT pass a port - let it choose automatically like Vercel does

      const config: MCPServerConfig = {
        command: "npx",
        args: ["mcp-remote", server.url],
        env: {},
      };

      // Add API key if needed
      if (server.authentication === "API Key" && apiKey) {
        config.env = {
          ...config.env,
          MCP_API_KEY: apiKey,
        };
      }

      // Add server to store
      addServer({
        name: server.name,
        config,
        status: ServerStatus.DISCONNECTED,
      });

      // Connect to server
      const response = await fetch("/api/mcp/connect-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: server.name,
          config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect to server");
      }

      const data = await response.json();
      addServer(data.server);

      // Different messages based on authentication type
      if (server.authentication.includes("OAuth")) {
        toast.info(
          `Connecting to "${server.name}"... A browser window will open for authentication. Please complete the OAuth flow within 2 minutes.`,
          { duration: 10000 },
        );
      } else if (server.authentication === "Open") {
        toast.success(`Connected to "${server.name}"!`);
      } else {
        toast.success(`"${server.name}" is ready to connect.`);
      }

      setOpen(false);
      setApiKey("");
      setSelectedServer(null);
    } catch (error) {
      console.error("Failed to connect server:", error);
      toast.error(`Failed to add "${server.name}"`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Remote MCP
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-[90vw] w-[90vw] max-h-[85vh]"
          style={{ maxWidth: "90vw", width: "90vw" }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl">
              Remote MCP Server Library
            </DialogTitle>
            <DialogDescription className="text-sm">
              Browse and add remote MCP servers to your client. OAuth servers
              will open an authentication window.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search servers by name, category, or maintainer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 h-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Server List */}
            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-2">
                {filteredServers.map((server) => {
                  const isAdded = servers.find((s) => s.name === server.name);

                  return (
                    <Card
                      key={server.name}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-base">
                              {server.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {server.category}
                            </Badge>
                            <Badge
                              variant={getAuthBadgeVariant(
                                server.authentication,
                              )}
                              className="text-xs gap-1"
                            >
                              {getAuthIcon(server.authentication)}
                              {server.authentication}
                            </Badge>
                            {server.authentication === "OAuth2.1 🔐" && (
                              <Badge
                                variant="outline"
                                className="text-xs text-orange-500 border-orange-500"
                              >
                                Pre-registration Required
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground font-mono">
                              {server.url}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Maintained by{" "}
                              <span className="font-medium">
                                {server.maintainer}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "default"}
                          disabled={!!(isAdded || isConnecting)}
                          onClick={() => handleAddServer(server)}
                          className="gap-2"
                        >
                          {isConnecting &&
                          selectedServer?.name === server.name ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : isAdded ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">
                  {filteredServers.length} of {remoteMCPServers.length} servers
                </span>
                <span>
                  {
                    filteredServers.filter((s) => s.authentication === "Open")
                      .length
                  }{" "}
                  Open •
                  {
                    filteredServers.filter((s) =>
                      s.authentication.includes("OAuth"),
                    ).length
                  }{" "}
                  OAuth •
                  {
                    filteredServers.filter(
                      (s) => s.authentication === "API Key",
                    ).length
                  }{" "}
                  API Key
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
                onClick={() =>
                  window.open(
                    "https://github.com/jaw9c/awesome-remote-mcp-servers",
                    "_blank",
                  )
                }
              >
                View on GitHub
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog
        open={selectedServer?.authentication === "API Key" && !apiKey}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedServer(null);
            setApiKey("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter API Key</DialogTitle>
            <DialogDescription>
              {selectedServer?.name} requires an API key for authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>
                Your API key will be securely transmitted to the server.
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedServer(null);
                  setApiKey("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedServer && connectWithMcpRemote(selectedServer)
                }
                disabled={!apiKey || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
