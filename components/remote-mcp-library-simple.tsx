'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  Search,
  ExternalLink,
  Shield,
  Key,
  Globe,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useMCPStore } from '@/lib/stores/mcp-store';
import { MCPServerConfig, ServerStatus } from '@/lib/types/mcp';
import { toast } from 'sonner';
import { tokenStorage } from '@/lib/utils/token-storage';

interface RemoteMCPServer {
  name: string;
  category: string;
  url: string;
  authentication: 'OAuth2.1' | 'OAuth2.1 🔐' | 'API Key' | 'Open';
  maintainer: string;
  description?: string;
}

const remoteMCPServers: RemoteMCPServer[] = [
  // OAuth2.1 Servers (with dynamic registration)
  { name: 'Asana', category: 'Project Management', url: 'https://mcp.asana.com/sse', authentication: 'OAuth2.1', maintainer: 'Asana' },
  { name: 'Audioscrape', category: 'RAG-as-a-Service', url: 'https://mcp.audioscrape.com', authentication: 'OAuth2.1', maintainer: 'Audioscrape' },
  { name: 'Buildkite', category: 'Software Development', url: 'https://mcp.buildkite.com/mcp', authentication: 'OAuth2.1', maintainer: 'Buildkite' },
  { name: 'Canva', category: 'Design', url: 'https://mcp.canva.com/mcp', authentication: 'OAuth2.1', maintainer: 'Canva' },
  { name: 'Carbon Voice', category: 'Productivity', url: 'https://mcp.carbonvoice.app', authentication: 'OAuth2.1', maintainer: 'Carbon Voice' },
  { name: 'Cloudflare Workers', category: 'Software Development', url: 'https://bindings.mcp.cloudflare.com/sse', authentication: 'OAuth2.1', maintainer: 'Cloudflare' },
  { name: 'Cloudflare Observability', category: 'Observability', url: 'https://observability.mcp.cloudflare.com/sse', authentication: 'OAuth2.1', maintainer: 'Cloudflare' },
  { name: 'Cloudinary', category: 'Asset Management', url: 'https://asset-management.mcp.cloudinary.com/sse', authentication: 'OAuth2.1', maintainer: 'Cloudinary' },
  { name: 'Dialer', category: 'Outbound Phone Calls', url: 'https://getdialer.app/sse', authentication: 'OAuth2.1', maintainer: 'Dialer' },
  { name: 'Egnyte', category: 'Document Management', url: 'https://mcp-server.egnyte.com/sse', authentication: 'OAuth2.1', maintainer: 'Egnyte' },
  { name: 'Firefly', category: 'Productivity', url: 'https://api.fireflies.ai/mcp', authentication: 'OAuth2.1', maintainer: 'Firefly' },
  { name: 'Globalping', category: 'Software Development', url: 'https://mcp.globalping.dev/sse', authentication: 'OAuth2.1', maintainer: 'Globalping' },
  { name: 'Grafbase', category: 'Software Development', url: 'https://api.grafbase.com/mcp', authentication: 'OAuth2.1', maintainer: 'Grafbase' },
  { name: 'Hive Intelligence', category: 'Crypto', url: 'https://hiveintelligence.xyz/mcp', authentication: 'OAuth2.1', maintainer: 'Hive Intelligence' },
  { name: 'Instant', category: 'Software Development', url: 'https://mcp.instantdb.com/mcp', authentication: 'OAuth2.1', maintainer: 'Instant' },
  { name: 'Intercom', category: 'Customer Support', url: 'https://mcp.intercom.com/sse', authentication: 'OAuth2.1', maintainer: 'Intercom' },
  { name: 'Invideo', category: 'Video Platform', url: 'https://mcp.invideo.io/sse', authentication: 'OAuth2.1', maintainer: 'Invideo' },
  { name: 'Jam', category: 'Software Development', url: 'https://mcp.jam.dev/mcp', authentication: 'OAuth2.1', maintainer: 'Jam.dev' },
  { name: 'Kollektiv', category: 'Documentation', url: 'https://mcp.thekollektiv.ai/sse', authentication: 'OAuth2.1', maintainer: 'Kollektiv' },
  { name: 'Linear', category: 'Project Management', url: 'https://mcp.linear.app/sse', authentication: 'OAuth2.1', maintainer: 'Linear' },
  { name: 'Listenetic', category: 'Productivity', url: 'https://mcp.listenetic.com/v1/mcp', authentication: 'OAuth2.1', maintainer: 'Listenetic' },
  { name: 'Meta Ads by Pipeboard', category: 'Advertising', url: 'https://mcp.pipeboard.co/meta-ads-mcp', authentication: 'OAuth2.1', maintainer: 'Pipeboard' },
  { name: 'monday.com', category: 'Productivity', url: 'https://mcp.monday.com/sse', authentication: 'OAuth2.1', maintainer: 'monday.com' },
  { name: 'Neon', category: 'Software Development', url: 'https://mcp.neon.tech/sse', authentication: 'OAuth2.1', maintainer: 'Neon' },
  { name: 'Netlify', category: 'Software Development', url: 'https://netlify-mcp.netlify.app/mcp', authentication: 'OAuth2.1', maintainer: 'Netlify' },
  { name: 'Notion', category: 'Project Management', url: 'https://mcp.notion.com/sse', authentication: 'OAuth2.1', maintainer: 'Notion' },
  { name: 'Octagon', category: 'Market Intelligence', url: 'https://mcp.octagonagents.com/mcp', authentication: 'OAuth2.1', maintainer: 'Octagon' },
  { name: 'OneContext', category: 'RAG-as-a-Service', url: 'https://rag-mcp-2.whatsmcp.workers.dev/sse', authentication: 'OAuth2.1', maintainer: 'OneContext' },
  { name: 'PayPal', category: 'Payments', url: 'https://mcp.paypal.com/sse', authentication: 'OAuth2.1', maintainer: 'PayPal' },
  { name: 'Prisma Postgres', category: 'Database', url: 'https://mcp.prisma.io/mcp', authentication: 'OAuth2.1', maintainer: 'Prisma' },
  { name: 'Rube', category: 'Other', url: 'https://rube.app/mcp', authentication: 'OAuth2.1', maintainer: 'Composio' },
  { name: 'Scorecard', category: 'AI Evaluation', url: 'https://scorecard-mcp.dare-d5b.workers.dev/sse', authentication: 'OAuth2.1', maintainer: 'Scorecard' },
  { name: 'Sentry', category: 'Software Development', url: 'https://mcp.sentry.dev/sse', authentication: 'OAuth2.1', maintainer: 'Sentry' },
  { name: 'Stripe', category: 'Payments', url: 'https://mcp.stripe.com/', authentication: 'OAuth2.1', maintainer: 'Stripe' },
  { name: 'Stytch', category: 'Authentication', url: 'http://mcp.stytch.dev/mcp', authentication: 'OAuth2.1', maintainer: 'Stytch' },
  { name: 'Square', category: 'Payments', url: 'https://mcp.squareup.com/sse', authentication: 'OAuth2.1', maintainer: 'Square' },
  { name: 'Turkish Airlines', category: 'Airlines', url: 'https://mcp.turkishtechlab.com/mcp', authentication: 'OAuth2.1', maintainer: 'Turkish Technology' },
  { name: 'Vercel', category: 'Software Development', url: 'https://mcp.vercel.com/', authentication: 'OAuth2.1', maintainer: 'Vercel' },
  { name: 'Webflow', category: 'CMS', url: 'https://mcp.webflow.com/sse', authentication: 'OAuth2.1', maintainer: 'Webflow' },
  { name: 'Wix', category: 'CMS', url: 'https://mcp.wix.com/sse', authentication: 'OAuth2.1', maintainer: 'Wix' },
  { name: 'Simplescraper', category: 'Web Scraping', url: 'https://mcp.simplescraper.io/mcp', authentication: 'OAuth2.1', maintainer: 'Simplescraper' },
  { name: 'WayStation', category: 'Productivity', url: 'https://waystation.ai/mcp', authentication: 'OAuth2.1', maintainer: 'WayStation' },
  { name: 'Zenable', category: 'Security', url: 'https://mcp.www.zenable.app/', authentication: 'OAuth2.1', maintainer: 'Zenable' },
  { name: 'Zine', category: 'Memory', url: 'https://www.zine.ai/mcp', authentication: 'OAuth2.1', maintainer: 'Zine' },

  // OAuth2.1 Servers (requires pre-registration)
  { name: 'Atlassian', category: 'Software Development', url: 'https://mcp.atlassian.com/v1/sse', authentication: 'OAuth2.1 🔐', maintainer: 'Atlassian' },
  { name: 'Box', category: 'Document Management', url: 'https://mcp.box.com', authentication: 'OAuth2.1 🔐', maintainer: 'Box' },
  { name: 'GitHub', category: 'Software Development', url: 'https://api.githubcopilot.com/mcp', authentication: 'OAuth2.1 🔐', maintainer: 'GitHub' },
  { name: 'Plaid', category: 'Payments', url: 'https://api.dashboard.plaid.com/mcp/sse', authentication: 'OAuth2.1 🔐', maintainer: 'Plaid' },

  // Open Authentication Servers
  { name: 'Astro Docs', category: 'Documentation', url: 'https://mcp.docs.astro.build/mcp', authentication: 'Open', maintainer: 'Astro' },
  { name: 'Cloudflare Docs', category: 'Documentation', url: 'https://docs.mcp.cloudflare.com/sse', authentication: 'Open', maintainer: 'Cloudflare' },
  { name: 'DeepWiki', category: 'RAG-as-a-Service', url: 'https://mcp.deepwiki.com/sse', authentication: 'Open', maintainer: 'Devin' },
  { name: 'Find-A-Domain', category: 'Productivity', url: 'https://api.findadomain.dev/mcp', authentication: 'Open', maintainer: 'Find-A-Domain' },
  { name: 'GitMCP', category: 'Software Development', url: 'https://gitmcp.io/docs', authentication: 'Open', maintainer: 'GitMCP' },
  { name: 'Hugging Face', category: 'Software Development', url: 'https://hf.co/mcp', authentication: 'Open', maintainer: 'Hugging Face' },
  { name: 'Javadocs', category: 'Software Development', url: 'https://www.javadocs.dev/mcp', authentication: 'Open', maintainer: 'Javadocs.dev' },
  { name: 'LLM Text', category: 'Data Analysis', url: 'https://mcp.llmtxt.dev/sse', authentication: 'Open', maintainer: 'LLM Text' },
  { name: 'Manifold', category: 'Forecasting', url: 'https://api.manifold.markets/v0/mcp', authentication: 'Open', maintainer: 'Manifold' },
  { name: 'OpenMesh', category: 'Service Discovery', url: 'https://api.openmesh.dev/mcp', authentication: 'Open', maintainer: 'OpenMesh' },
  { name: 'OpenZeppelin Cairo', category: 'Software Development', url: 'https://mcp.openzeppelin.com/contracts/cairo/mcp', authentication: 'Open', maintainer: 'OpenZeppelin' },
  { name: 'OpenZeppelin Solidity', category: 'Software Development', url: 'https://mcp.openzeppelin.com/contracts/solidity/mcp', authentication: 'Open', maintainer: 'OpenZeppelin' },
  { name: 'OpenZeppelin Stellar', category: 'Software Development', url: 'https://mcp.openzeppelin.com/contracts/stellar/mcp', authentication: 'Open', maintainer: 'OpenZeppelin' },
  { name: 'OpenZeppelin Stylus', category: 'Software Development', url: 'https://mcp.openzeppelin.com/contracts/stylus/mcp', authentication: 'Open', maintainer: 'OpenZeppelin' },
  { name: 'Remote MCP', category: 'MCP Directory', url: 'https://mcp.remote-mcp.com', authentication: 'Open', maintainer: 'Remote MCP' },
  { name: 'Semgrep', category: 'Software Development', url: 'https://mcp.semgrep.ai/sse', authentication: 'Open', maintainer: 'Semgrep' },

  // API Key Authentication Servers
  { name: 'Apify', category: 'Web Data Extraction', url: 'https://mcp.apify.com', authentication: 'API Key', maintainer: 'Apify' },
  { name: 'Close', category: 'CRM', url: 'https://mcp.close.com/mcp', authentication: 'API Key', maintainer: 'Close' },
  { name: 'Dappier', category: 'RAG-as-a-Service', url: 'https://mcp.dappier.com/mcp', authentication: 'API Key', maintainer: 'Dappier' },
  { name: 'Dodo Payments', category: 'Payments', url: 'https://mcp.dodopayments.com/sse', authentication: 'API Key', maintainer: 'Dodo Payments' },
  { name: 'HubSpot', category: 'CRM', url: 'https://app.hubspot.com/mcp/v1/http', authentication: 'API Key', maintainer: 'HubSpot' },
  { name: 'Mercado Libre', category: 'E-Commerce', url: 'https://mcp.mercadolibre.com/mcp', authentication: 'API Key', maintainer: 'Mercado Libre' },
  { name: 'Mercado Pago', category: 'Payments', url: 'https://mcp.mercadopago.com/mcp', authentication: 'API Key', maintainer: 'Mercado Pago' },
  { name: 'Needle', category: 'RAG-as-a-Service', url: 'https://mcp.needle-ai.com/mcp', authentication: 'API Key', maintainer: 'Needle' },
  { name: 'Polar Signals', category: 'Software Development', url: 'https://api.polarsignals.com/api/mcp/', authentication: 'API Key', maintainer: 'Polar Signals' },
  { name: 'Short.io', category: 'Link Shortener', url: 'https://ai-assistant.short.io/mcp', authentication: 'API Key', maintainer: 'Short.io' },
  { name: 'Telnyx', category: 'Communication', url: 'https://api.telnyx.com/v2/mcp', authentication: 'API Key', maintainer: 'Telnyx' },
  { name: 'Zapier', category: 'Automation', url: 'https://mcp.zapier.com/api/mcp/mcp', authentication: 'API Key', maintainer: 'Zapier' },
];

export function RemoteMCPLibrarySimple() {
  const { servers, addServer } = useMCPStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [authToken, setAuthToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedServer, setSelectedServer] = useState<RemoteMCPServer | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [oauthSession, setOauthSession] = useState<string>('');
  const [isGettingToken, setIsGettingToken] = useState(false);

  const categories = ['all', ...Array.from(new Set(remoteMCPServers.map(s => s.category)))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a.localeCompare(b);
  });

  const filteredServers = remoteMCPServers.filter(server => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower ||
                         server.name.toLowerCase().includes(searchLower) ||
                         server.category.toLowerCase().includes(searchLower) ||
                         server.maintainer.toLowerCase().includes(searchLower);
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddServer = async (server: RemoteMCPServer) => {
    // Check if server already exists
    if (servers.find(s => s.name === server.name)) {
      toast.error(`Server "${server.name}" is already added`);
      return;
    }

    // Check for stored token first for OAuth servers
    if (server.authentication === 'OAuth2.1 🔐' || server.authentication === 'OAuth2.1') {
      const storedToken = tokenStorage.getToken(server.name);
      if (storedToken) {
        console.log(`[AddServer] Found stored token for ${server.name}, attempting to connect...`);
        try {
          await connectDirectly(server, storedToken.accessToken);
          toast.success(`Connected using stored token!`);
          return;
        } catch (error) {
          console.log(`[AddServer] Stored token failed, will reauthenticate:`, error);
          tokenStorage.removeToken(server.name);
          // Continue to OAuth flow
        }
      }

      // Start OAuth flow for all OAuth servers
      console.log('[Connect] Starting OAuth flow for:', server.name);
      setSelectedServer(server);
      await performOAuthFlow(server);
      return;
    }

    if (server.authentication === 'API Key') {
      // Show API key dialog
      setSelectedServer(server);
      setShowAuthDialog(true);
      return;
    }

    // For Open servers, connect directly
    await connectDirectly(server, '');
  };

  const connectDirectly = async (server: RemoteMCPServer, token: string) => {
    console.log('[connectDirectly] Called with server:', server.name);
    console.log('[connectDirectly] Token received:', token);
    console.log('[connectDirectly] Token length:', token?.length);
    console.log('[connectDirectly] Token first 50 chars:', token?.substring(0, 50));

    setIsConnecting(true);

    try {
      // Create a direct SSE connection configuration
      const config: MCPServerConfig = {
        type: 'remote-sse',
        url: server.url,
        name: server.name,
        authToken: token || undefined,
      } as any;

      // Add server to store
      addServer({
        name: server.name,
        config,
        status: ServerStatus.DISCONNECTED,
      });

      // Log what we're about to send
      const requestPayload = {
        name: server.name,
        url: server.url,
        authToken: token || undefined,
      };
      console.log('[connectDirectly] Sending to /api/mcp/connect-sse:', requestPayload);
      console.log('[connectDirectly] authToken in payload:', requestPayload.authToken);

      // Connect to server using our SSE endpoint
      const response = await fetch('/api/mcp/connect-sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect to server');
      }

      const data = await response.json();
      addServer(data.server);

      toast.success(`Connected to "${server.name}"!`);
      setOpen(false);
      setShowAuthDialog(false);
      setAuthToken('');
      setApiKey('');
      setSelectedServer(null);

    } catch (error) {
      console.error('Failed to connect server:', error);
      toast.error(`Failed to connect to "${server.name}"`);
    } finally {
      setIsConnecting(false);
    }
  };

  const performOAuthFlow = async (server: RemoteMCPServer) => {
    console.log('[OAuth Flow] Starting for server:', server.name, server.url);
    setIsGettingToken(true);

    try {
      // Step 1: Discover OAuth metadata
      console.log('[OAuth Flow] Step 1: Discovering OAuth metadata...');
      toast.info('Discovering OAuth configuration...', { duration: 2000 });

      const discoverResponse = await fetch('/api/mcp/oauth/complete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: server.url,
          serverName: server.name,
          step: 'discover',
        }),
      });

      if (!discoverResponse.ok) {
        const error = await discoverResponse.json();
        throw new Error(error.error || 'Failed to discover OAuth metadata');
      }

      const { metadata, scope, supportsRegistration } = await discoverResponse.json();

      if (!supportsRegistration && server.authentication !== 'OAuth2.1 🔐') {
        console.warn(`${server.name} doesn't support dynamic registration but is not marked as requiring pre-registration`);
      }

      // Step 2: Register client
      const registerResponse = await fetch('/api/mcp/oauth/complete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: server.url,
          serverName: server.name,
          step: 'register',
          data: { metadata, scope },
        }),
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.error || 'Failed to register client');
      }

      const { clientInfo, redirectUri } = await registerResponse.json();

      // Step 3: Get authorization URL
      const authorizeResponse = await fetch('/api/mcp/oauth/complete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: server.url,
          serverName: server.name,
          step: 'authorize',
          data: { metadata, clientInfo, scope, redirectUri },
        }),
      });

      if (!authorizeResponse.ok) {
        const error = await authorizeResponse.json();
        throw new Error(error.error || 'Failed to get authorization URL');
      }

      const { authorizationUrl, sessionData } = await authorizeResponse.json();
      console.log('[OAuth Client] Received sessionData:', sessionData);
      setOauthSession(sessionData);

      // Store sessionData in closure for callback
      const storedSessionData = sessionData;

      // Step 4: Open OAuth popup
      toast.info('Opening authorization window...', { duration: 2000 });

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      console.log('[OAuth] Opening popup with URL:', authorizationUrl);
      const popup = window.open(
        authorizationUrl,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        toast.error('Please allow popups for this site to complete OAuth');
        setIsGettingToken(false);
        return;
      }

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        console.log('[OAuth] Received message:', event.data);

        // Check origin for security
        if (event.origin !== window.location.origin) {
          console.log('[OAuth] Ignoring message from different origin:', event.origin);
          return;
        }

        if (event.data.type === 'oauth-callback') {
          console.log('[OAuth] Processing OAuth callback');
          window.removeEventListener('message', handleMessage);

          if (event.data.error) {
            console.error('[OAuth] OAuth error:', event.data.error);
            toast.error(`OAuth failed: ${event.data.errorDescription || event.data.error}`);
            setIsGettingToken(false);
            return;
          }

          if (event.data.code) {
            console.log('[OAuth] Got authorization code:', event.data.code);
            console.log('[OAuth] Using storedSessionData:', storedSessionData);

            if (!storedSessionData) {
              console.error('[OAuth] ERROR: No session data available!');
              toast.error('OAuth session lost. Please try again.');
              setIsGettingToken(false);
              return;
            }

            // Step 5: Exchange code for token
            toast.info('Completing authentication...', { duration: 2000 });

            try {
              console.log('[OAuth] Sending exchange request with:', {
                serverUrl: server.url,
                serverName: server.name,
                code: event.data.code,
                hasSessionData: !!storedSessionData
              });

              const exchangeResponse = await fetch('/api/mcp/oauth/complete-flow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  serverUrl: server.url,
                  serverName: server.name,
                  step: 'exchange',
                  data: { code: event.data.code, sessionData: storedSessionData },
                }),
              });

              if (!exchangeResponse.ok) {
                const error = await exchangeResponse.json();
                throw new Error(error.error || 'Failed to exchange code for token');
              }

              const tokenData = await exchangeResponse.json();
              console.log('[OAuth] Token exchange response from server:', tokenData);
              console.log('[OAuth] Full response keys:', Object.keys(tokenData));
              console.log('[OAuth] Access token present:', !!tokenData.accessToken);
              console.log('[OAuth] Access token length:', tokenData.accessToken?.length);
              console.log('[OAuth] Access token full value:', tokenData.accessToken);
              console.log('[OAuth] Authorization code we sent:', event.data.code);

              if (!tokenData.accessToken) {
                console.error('[OAuth] ERROR: No access token in response:', tokenData);
                console.error('[OAuth] Expected accessToken field but got:', Object.keys(tokenData));
                throw new Error('No access token received from server');
              }

              // Double check we're not accidentally using the code
              const tokenToUse = tokenData.accessToken;
              console.log('[OAuth] About to connect with token:', tokenToUse);
              console.log('[OAuth] Token starts with:', tokenToUse.substring(0, 50));
              console.log('[OAuth] Token is same as code?', tokenToUse === event.data.code);

              // First test the SSE connection
              console.log('[OAuth] Testing SSE connection first...');
              const testResponse = await fetch('/api/mcp/test-sse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: server.url,
                  authToken: tokenToUse,
                }),
              });

              const testResult = await testResponse.json();
              console.log('[OAuth] SSE test result:', testResult);

              if (!testResponse.ok && testResult.status === 401) {
                console.error('[OAuth] SSE test failed with 401, token may be invalid');
                throw new Error('Authentication failed during SSE test');
              }

              // Store the token for future use
              tokenStorage.storeToken(
                server.name,
                server.url,
                tokenToUse,
                tokenData.expiresIn,
                tokenData.refreshToken
              );
              console.log('[OAuth] Token stored for future use');

              // Connect with the token
              await connectDirectly(server, tokenToUse);
              toast.success('OAuth authentication successful!');
            } catch (error) {
              console.error('[OAuth] Token exchange failed:', error);
              toast.error('Failed to complete OAuth flow');
            }
          }

          setIsGettingToken(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Clean up if popup is closed
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
          setIsGettingToken(false);
        }
      }, 1000);

    } catch (error) {
      console.error('[OAuth Flow] ERROR - OAuth flow failed:', error);
      console.error('[OAuth Flow] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error(error instanceof Error ? error.message : 'OAuth flow failed');
      setIsGettingToken(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!selectedServer) return;

    const token = selectedServer.authentication === 'API Key' ? apiKey : authToken;
    if (!token) {
      toast.error('Please provide authentication credentials');
      return;
    }

    await connectDirectly(selectedServer, token);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="h-4 w-4" />
            Add Remote MCP
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[85vh]" style={{ maxWidth: '90vw', width: '90vw' }}>
          <DialogHeader>
            <DialogTitle className="text-xl">Remote MCP Server Library</DialogTitle>
            <DialogDescription className="text-sm">
              Connect directly to remote MCP servers with automatic OAuth authentication
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search servers..."
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
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Server List */}
            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-2">
                {filteredServers.map((server) => {
                  const isAdded = servers.find(s => s.name === server.name);
                  const isThisServerConnecting = isGettingToken && selectedServer?.name === server.name;

                  return (
                    <Card key={server.name} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-base">{server.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {server.category}
                            </Badge>
                            <Badge
                              variant={server.authentication.includes('OAuth') ? 'default' :
                                     server.authentication === 'API Key' ? 'secondary' : 'outline'}
                              className="text-xs gap-1"
                            >
                              {server.authentication.includes('OAuth') ? <Shield className="h-3 w-3" /> :
                               server.authentication === 'API Key' ? <Key className="h-3 w-3" /> :
                               <Globe className="h-3 w-3" />}
                              {server.authentication}
                            </Badge>
                            {server.authentication === 'OAuth2.1 🔐' && (
                              <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                                Pre-registration Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {server.url}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : server.authentication === 'OAuth2.1' ? "default" : "outline"}
                          disabled={isAdded || isThisServerConnecting || (server.authentication === 'OAuth2.1 🔐')}
                          onClick={() => handleAddServer(server)}
                          className="gap-2 min-w-[100px]"
                        >
                          {isThisServerConnecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : isAdded ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added
                            </>
                          ) : server.authentication === 'OAuth2.1' ? (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Connect
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
                  {filteredServers.filter(s => s.authentication === 'Open').length} Open •
                  {filteredServers.filter(s => s.authentication.includes('OAuth')).length} OAuth •
                  {filteredServers.filter(s => s.authentication === 'API Key').length} API Key
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
                onClick={() => window.open('https://github.com/jaw9c/awesome-remote-mcp-servers', '_blank')}
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
        open={showAuthDialog && selectedServer?.authentication === 'API Key'}
        onOpenChange={(open) => {
          if (!open) {
            setShowAuthDialog(false);
            setSelectedServer(null);
            setApiKey('');
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
                  setShowAuthDialog(false);
                  setSelectedServer(null);
                  setApiKey('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAuthSubmit}
                disabled={!apiKey || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}