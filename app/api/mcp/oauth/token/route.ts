import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, sessionData: encodedSessionData } = await request.json();

    if (!code || !encodedSessionData) {
      return NextResponse.json(
        { error: 'Missing code or session data' },
        { status: 400 }
      );
    }

    // Decode session data
    const sessionData = JSON.parse(atob(encodedSessionData));
    const { tokenEndpoint, codeVerifier, redirectUri, serverName, metadata } = sessionData;

    console.log(`[OAuth] Exchanging code for token for ${serverName}`);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        client_id: 'nextjs-mcp-client', // For dynamic registration
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed:', error);
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();

    // Return the access token
    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type || 'Bearer',
    });

  } catch (error) {
    console.error('[OAuth] Token exchange error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token exchange failed' },
      { status: 500 }
    );
  }
}