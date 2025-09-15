import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      code,
      clientId,
      clientSecret,
      redirectUri,
      tokenEndpoint,
      grantType,
      codeVerifier,
    } = await request.json();

    // Build token request
    const tokenParams = new URLSearchParams({
      grant_type: grantType || "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    // Add client secret if provided (not needed for PKCE)
    if (clientSecret) {
      tokenParams.append("client_secret", clientSecret);
    }

    // Add PKCE verifier if provided
    if (codeVerifier) {
      tokenParams.append("code_verifier", codeVerifier);
    }

    // Exchange code for token
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.json(
        { error: `Token exchange failed: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("OAuth token exchange error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Token exchange failed",
      },
      { status: 500 },
    );
  }
}
