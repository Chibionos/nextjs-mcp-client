import { NextRequest, NextResponse } from 'next/server';
import { discoverAuthorizationServerMetadata, startAuthorization } from '@modelcontextprotocol/sdk/client/auth.js';

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return verifier;
}

async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const { serverUrl, serverName } = await request.json();

    if (!serverUrl) {
      return NextResponse.json(
        { error: 'Server URL is required' },
        { status: 400 }
      );
    }

    console.log(`[OAuth] Starting OAuth flow for ${serverName} at ${serverUrl}`);

    // Discover OAuth metadata from the server
    const metadata = await discoverAuthorizationServerMetadata(new URL(serverUrl));

    if (!metadata) {
      return NextResponse.json(
        { error: 'Server does not support OAuth' },
        { status: 400 }
      );
    }

    // Generate state and PKCE parameters
    const state = crypto.randomUUID();
    const codeVerifier = generatePKCE();
    const codeChallenge = await sha256(codeVerifier);

    // Build the authorization URL
    const authUrl = new URL(metadata.authorization_endpoint);

    // Determine the redirect URI (for local development)
    const redirectUri = `${request.headers.get('origin')}/api/mcp/oauth/callback`;

    // Set OAuth parameters
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', 'nextjs-mcp-client'); // We'll use dynamic registration
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Add scopes if available
    if (metadata.scopes_supported && metadata.scopes_supported.length > 0) {
      authUrl.searchParams.set('scope', metadata.scopes_supported.join(' '));
    }

    // Store OAuth session data (we'll need this for the callback)
    // In production, use a proper session store
    const sessionData = {
      serverUrl,
      serverName,
      state,
      codeVerifier,
      redirectUri,
      tokenEndpoint: metadata.token_endpoint,
      metadata
    };

    // For now, we'll return the session data to the client to store
    // In production, use server-side sessions
    return NextResponse.json({
      authUrl: authUrl.toString(),
      sessionData: btoa(JSON.stringify(sessionData))
    });

  } catch (error) {
    console.error('[OAuth] Failed to initiate OAuth flow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start OAuth flow' },
      { status: 500 }
    );
  }
}