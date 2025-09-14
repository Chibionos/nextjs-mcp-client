import { NextRequest, NextResponse } from 'next/server';
import {
  discoverAuthorizationServerMetadata,
  registerClient,
  startAuthorization,
  exchangeAuthorization,
  discoverOAuthProtectedResourceMetadata,
} from '@modelcontextprotocol/sdk/client/auth.js';
import {
  OAuthClientMetadata,
  OAuthClientInformation
} from '@modelcontextprotocol/sdk/shared/auth.js';

// Generate state
function generateState() {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    const { serverUrl, serverName, step, data = {} } = await request.json();

    if (!serverUrl) {
      return NextResponse.json(
        { error: 'Server URL is required' },
        { status: 400 }
      );
    }

    console.log(`[OAuth] Step: ${step} for ${serverName} at ${serverUrl}`);

    switch (step) {
      case 'discover': {
        // Step 1: Discover OAuth metadata
        let authServerUrl = new URL("/", serverUrl);
        let resourceMetadata = null;
        let resource = null;

        try {
          // Try to discover resource metadata first
          resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl);
          if (resourceMetadata?.authorization_servers?.length) {
            authServerUrl = new URL(resourceMetadata.authorization_servers[0]);
          }
        } catch (e) {
          console.log('[OAuth] No resource metadata found, using base URL');
        }

        // Discover authorization server metadata
        const metadata = await discoverAuthorizationServerMetadata(authServerUrl);

        if (!metadata) {
          throw new Error('Failed to discover OAuth metadata');
        }

        // Determine scopes
        const scopesSupported = resourceMetadata?.scopes_supported || metadata.scopes_supported || [];
        const scope = scopesSupported.join(' ');

        return NextResponse.json({
          metadata,
          resourceMetadata,
          authServerUrl: authServerUrl.toString(),
          scope,
          supportsRegistration: !!metadata.registration_endpoint
        });
      }

      case 'register': {
        // Step 2: Register client (dynamic registration)
        const { metadata, scope } = data;
        const redirectUri = `${request.headers.get('origin')}/api/mcp/oauth/callback`;

        const clientMetadata: OAuthClientMetadata = {
          redirect_uris: [redirectUri],
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          client_name: 'NextJS MCP Client',
          client_uri: request.headers.get('origin') || 'http://localhost:3000',
          scope: scope || '',
        };

        let clientInfo: OAuthClientInformation;

        if (metadata.registration_endpoint) {
          // Dynamic client registration
          console.log('[OAuth] Performing dynamic client registration');
          clientInfo = await registerClient(serverUrl, {
            metadata,
            clientMetadata,
          });
        } else {
          // No registration endpoint - use static client
          console.log('[OAuth] No registration endpoint, using static client');
          clientInfo = {
            client_id: 'nextjs-mcp-client',
            client_secret: 'nextjs-mcp-client-secret',
          };
        }

        return NextResponse.json({
          clientInfo,
          redirectUri
        });
      }

      case 'authorize': {
        // Step 3: Start authorization with PKCE
        const { metadata, clientInfo, scope, redirectUri } = data;

        const state = generateState();

        // Start authorization and get PKCE verifier
        const authResult = await startAuthorization(serverUrl, {
          metadata,
          clientInformation: clientInfo,
          redirectUrl: redirectUri,
          scope,
          state,
        });

        console.log('[OAuth] Authorization started with PKCE');
        console.log('[OAuth] Has codeVerifier:', !!authResult.codeVerifier);
        console.log('[OAuth] CodeVerifier length:', authResult.codeVerifier?.length);

        // Store session data for callback
        const sessionData = {
          serverUrl,
          serverName,
          metadata,
          clientInfo,
          codeVerifier: authResult.codeVerifier,
          redirectUri,
          state
        };

        return NextResponse.json({
          authorizationUrl: authResult.authorizationUrl.toString(),
          sessionData: btoa(JSON.stringify(sessionData))
        });
      }

      case 'exchange': {
        // Step 4: Exchange authorization code for token
        console.log('[OAuth] Exchange request data:', JSON.stringify(data, null, 2));
        const { code, sessionData: encodedSessionData } = data;

        if (!code || !encodedSessionData) {
          console.error('[OAuth] Missing data - code:', !!code, 'sessionData:', !!encodedSessionData);
          throw new Error('Missing authorization code or session data');
        }

        const sessionData = JSON.parse(atob(encodedSessionData));
        const { metadata, clientInfo, codeVerifier, redirectUri, serverUrl: originalServerUrl } = sessionData;

        console.log('[OAuth] Token exchange starting');
        console.log('[OAuth] Code received:', !!code);
        console.log('[OAuth] CodeVerifier present:', !!codeVerifier);
        console.log('[OAuth] CodeVerifier length:', codeVerifier?.length);
        console.log('[OAuth] Using serverUrl:', originalServerUrl || serverUrl);

        // Use the original serverUrl from session
        const tokens = await exchangeAuthorization(originalServerUrl || serverUrl, {
          metadata,
          clientInformation: clientInfo,
          authorizationCode: code,
          codeVerifier: codeVerifier || undefined,
          redirectUri,
        });

        return NextResponse.json({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type || 'Bearer',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid step' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[OAuth] Error in flow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OAuth flow failed' },
      { status: 500 }
    );
  }
}