import {
  discoverAuthorizationServerMetadata,
  discoverOAuthProtectedResourceMetadata,
  exchangeAuthorization,
  registerClient,
  startAuthorization,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformation,
  OAuthClientMetadata,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { type NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/utils/app-url";

// Generate state
function generateState() {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  console.log("[OAuth] ========================================");
  console.log("[OAuth] New OAuth request received");
  console.log("[OAuth] Request headers:", {
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
  });

  try {
    const body = await request.json();
    console.log("[OAuth] Request body:", JSON.stringify(body, null, 2));
    const { serverUrl, serverName, step, data = {} } = body;

    if (!serverUrl) {
      console.error("[OAuth] ERROR: Server URL is missing from request");
      return NextResponse.json(
        { error: "Server URL is required" },
        { status: 400 },
      );
    }

    console.log(`[OAuth] Processing step: ${step}`);
    console.log(`[OAuth] Server: ${serverName} at ${serverUrl}`);
    console.log(`[OAuth] Step data keys:`, Object.keys(data));

    switch (step) {
      case "discover": {
        console.log("[OAuth] STEP 1: DISCOVER - Starting OAuth metadata discovery");
        // Step 1: Discover OAuth metadata
        let authServerUrl = new URL("/", serverUrl);
        let resourceMetadata = null;
        const resource = null;

        console.log("[OAuth] Attempting to discover resource metadata from:", serverUrl);
        try {
          // Try to discover resource metadata first
          resourceMetadata =
            await discoverOAuthProtectedResourceMetadata(serverUrl);
          console.log("[OAuth] Resource metadata found:", {
            hasMetadata: !!resourceMetadata,
            authorization_servers: resourceMetadata?.authorization_servers,
          });
          if (resourceMetadata?.authorization_servers?.length) {
            authServerUrl = new URL(resourceMetadata.authorization_servers[0]);
            console.log("[OAuth] Using authorization server from metadata:", authServerUrl.toString());
          }
        } catch (e) {
          console.log("[OAuth] No resource metadata found, using base URL. Error:", e);
        }

        // Discover authorization server metadata
        console.log("[OAuth] Discovering authorization server metadata from:", authServerUrl.toString());
        const metadata =
          await discoverAuthorizationServerMetadata(authServerUrl);

        if (!metadata) {
          console.error("[OAuth] ERROR: Failed to discover OAuth metadata from:", authServerUrl.toString());
          throw new Error("Failed to discover OAuth metadata");
        }

        console.log("[OAuth] Authorization server metadata discovered:", {
          issuer: metadata.issuer,
          authorization_endpoint: metadata.authorization_endpoint,
          token_endpoint: metadata.token_endpoint,
          registration_endpoint: metadata.registration_endpoint,
          supportsRegistration: !!metadata.registration_endpoint,
        });

        // Determine scopes
        const scopesSupported =
          resourceMetadata?.scopes_supported || metadata.scopes_supported || [];
        const scope = scopesSupported.join(" ");

        console.log("[OAuth] Discover complete. Scopes:", scope);
        console.log("[OAuth] Returning authServerUrl:", authServerUrl.toString());

        return NextResponse.json({
          metadata,
          resourceMetadata,
          authServerUrl: authServerUrl.toString(),
          scope,
          supportsRegistration: !!metadata.registration_endpoint,
        });
      }

      case "register": {
        console.log("[OAuth] STEP 2: REGISTER - Starting client registration");
        // Step 2: Register client (dynamic registration)
        const { metadata, scope, authServerUrl } = data;

        console.log("[OAuth] Register data received:", {
          hasMetadata: !!metadata,
          scope,
          authServerUrl,
          serverUrl,
        });

        // Get the actual host from request headers for server-side context
        const host = request.headers.get("host");
        const proto = request.headers.get("x-forwarded-proto") || "https";
        const origin = request.headers.get("origin");
        const xForwardedHost = request.headers.get("x-forwarded-host");

        // Use origin if available (from client), otherwise construct from host
        const baseUrl = origin || (host ? `${proto}://${host}` : getAppUrl());
        const redirectUri = `${baseUrl}/oauth/callback`;

        console.log("[OAuth] URL Construction:");
        console.log("  - MCP Server URL:", serverUrl);
        console.log("  - Auth Server URL:", authServerUrl);
        console.log("  - Host header:", host);
        console.log("  - X-Forwarded-Host:", xForwardedHost);
        console.log("  - Proto header:", proto);
        console.log("  - Origin header:", origin);
        console.log("  - Computed Base URL:", baseUrl);
        console.log("  - Redirect URI:", redirectUri);
        console.log("  - Registration endpoint:", metadata.registration_endpoint);

        const clientMetadata: OAuthClientMetadata = {
          redirect_uris: [redirectUri],
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          client_name: "NextJS MCP Client",
          client_uri: baseUrl,
          scope: scope || "",
        };

        console.log("[OAuth] Client metadata:", JSON.stringify(clientMetadata, null, 2));

        let clientInfo: OAuthClientInformation;

        if (metadata.registration_endpoint) {
          // Dynamic client registration
          console.log("[OAuth] Dynamic registration endpoint found, proceeding with registration");
          // Use the authorization server URL, not the MCP server URL
          const registrationUrl = authServerUrl || serverUrl;
          console.log("[OAuth] Registration URL selected:", registrationUrl);
          console.log("[OAuth] Registration URL type:", typeof registrationUrl);

          if (!registrationUrl) {
            console.error("[OAuth] ERROR: Registration URL is undefined!");
            throw new Error("Registration URL is undefined");
          }

          console.log("[OAuth] Calling registerClient with:");
          console.log("  - URL:", registrationUrl);
          console.log("  - Metadata keys:", Object.keys(metadata));
          console.log("  - ClientMetadata:", JSON.stringify(clientMetadata, null, 2));

          try {
            clientInfo = await registerClient(registrationUrl, {
              metadata,
              clientMetadata,
            });
            console.log("[OAuth] ✅ Registration successful!");
            console.log("[OAuth] Client info received:", {
              client_id: clientInfo.client_id,
              hasSecret: !!clientInfo.client_secret,
            });
          } catch (error) {
            console.error("[OAuth] ❌ Registration failed!");
            console.error("[OAuth] Error type:", error?.constructor?.name);
            console.error("[OAuth] Error message:", error instanceof Error ? error.message : String(error));
            console.error("[OAuth] Error stack:", error instanceof Error ? error.stack : "No stack available");
            console.error("[OAuth] Full error object:", JSON.stringify(error, null, 2));
            throw error;
          }
        } else {
          // No registration endpoint - use static client
          console.log("[OAuth] No registration endpoint, using static client");
          clientInfo = {
            client_id: "nextjs-mcp-client",
            client_secret: "nextjs-mcp-client-secret",
          };
        }

        return NextResponse.json({
          clientInfo,
          redirectUri,
        });
      }

      case "authorize": {
        console.log("[OAuth] STEP 3: AUTHORIZE - Starting authorization with PKCE");
        // Step 3: Start authorization with PKCE
        const { metadata, clientInfo, scope, redirectUri, authServerUrl } = data;

        console.log("[OAuth] Authorize data received:", {
          hasMetadata: !!metadata,
          hasClientInfo: !!clientInfo,
          client_id: clientInfo?.client_id,
          scope,
          redirectUri,
          authServerUrl,
        });

        const state = generateState();
        console.log("[OAuth] Generated state:", state);

        // Start authorization and get PKCE verifier
        const authorizationUrl = authServerUrl || serverUrl;
        console.log("[OAuth] Using authorization URL:", authorizationUrl);

        const authResult = await startAuthorization(authorizationUrl, {
          metadata,
          clientInformation: clientInfo,
          redirectUrl: redirectUri,
          scope,
          state,
        });

        console.log("[OAuth] Authorization URL generated:", authResult.authorizationUrl.toString());
        console.log("[OAuth] PKCE details:", {
          hasCodeVerifier: !!authResult.codeVerifier,
          codeVerifierLength: authResult.codeVerifier?.length,
        });

        // Store session data for callback
        const sessionData = {
          serverUrl,
          serverName,
          authServerUrl: authServerUrl || serverUrl,
          metadata,
          clientInfo,
          codeVerifier: authResult.codeVerifier,
          redirectUri,
          state,
        };

        return NextResponse.json({
          authorizationUrl: authResult.authorizationUrl.toString(),
          sessionData: btoa(JSON.stringify(sessionData)),
        });
      }

      case "exchange": {
        console.log("[OAuth] STEP 4: EXCHANGE - Starting token exchange");
        // Step 4: Exchange authorization code for token
        console.log("[OAuth] Exchange request data keys:", Object.keys(data));
        console.log("[OAuth] Has code:", !!data.code);
        console.log("[OAuth] Has sessionData:", !!data.sessionData);

        const { code, sessionData: encodedSessionData } = data;

        if (!code || !encodedSessionData) {
          console.error("[OAuth] ERROR: Missing required data for exchange");
          console.error("  - code present:", !!code);
          console.error("  - sessionData present:", !!encodedSessionData);
          throw new Error("Missing authorization code or session data");
        }

        console.log("[OAuth] Code received (first 20 chars):", code.substring(0, 20) + "...");

        const sessionData = JSON.parse(atob(encodedSessionData));
        console.log("[OAuth] Decoded session data keys:", Object.keys(sessionData));

        const {
          metadata,
          clientInfo,
          codeVerifier,
          redirectUri,
          serverUrl: originalServerUrl,
          authServerUrl,
        } = sessionData;

        console.log("[OAuth] Exchange session details:");
        console.log("  - Original server URL:", originalServerUrl);
        console.log("  - Auth server URL:", authServerUrl);
        console.log("  - Current server URL:", serverUrl);
        console.log("  - Client ID:", clientInfo?.client_id);
        console.log("  - Has client secret:", !!clientInfo?.client_secret);
        console.log("  - CodeVerifier present:", !!codeVerifier);
        console.log("  - CodeVerifier length:", codeVerifier?.length);
        console.log("  - Redirect URI:", redirectUri);
        console.log("  - Token endpoint:", metadata?.token_endpoint);

        // Always do proper token exchange - never use the code directly
        console.log("[OAuth] Code preview:", code.substring(0, 50));

        let tokens: any = null;
        // Try manual token exchange first to debug
        console.log("[OAuth] Attempting manual token exchange...");

        try {
          const tokenEndpoint = metadata.token_endpoint;
          console.log("[OAuth] Token endpoint:", tokenEndpoint);

          const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri,
            client_id: clientInfo.client_id,
            ...(codeVerifier && { code_verifier: codeVerifier }),
          });

          console.log(
            "[OAuth] Token request params (first 100 chars):",
            tokenParams.toString().substring(0, 100),
          );

          const tokenResponse = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              // Don't include Authorization header since we're using none auth method
            },
            body: tokenParams,
          });

          console.log(
            "[OAuth] Manual token exchange response status:",
            tokenResponse.status,
          );
          const responseText = await tokenResponse.text();
          console.log(
            "[OAuth] Manual token exchange raw response:",
            responseText,
          );

          try {
            const tokenData = JSON.parse(responseText);
            console.log(
              "[OAuth] Manual token exchange parsed response:",
              tokenData,
            );

            if (tokenResponse.ok && tokenData.access_token) {
              tokens = tokenData;
              console.log("[OAuth] Manual token exchange successful!");
              console.log(
                "[OAuth] Access token from manual exchange:",
                tokenData.access_token,
              );
            } else {
              console.log(
                "[OAuth] Manual token exchange failed with:",
                tokenData,
              );
              console.log(
                "[OAuth] Error in response:",
                tokenData.error,
                tokenData.error_description,
              );
            }
          } catch (parseError) {
            console.error(
              "[OAuth] Failed to parse token response:",
              parseError,
            );
            console.log("[OAuth] Raw response was:", responseText);
          }

          if (!tokens) {
            console.log(
              "[OAuth] Manual token exchange failed, falling back to SDK...",
            );
          }
        } catch (manualError) {
          console.error("[OAuth] Manual token exchange error:", manualError);
          console.log("[OAuth] Falling back to SDK exchange...");
        }

        // Fallback to SDK if manual exchange failed
        if (!tokens) {
          console.log("[OAuth] Using SDK exchangeAuthorization...");
          // Use authServerUrl if available, otherwise fall back to originalServerUrl or serverUrl
          const exchangeUrl = authServerUrl || originalServerUrl || serverUrl;
          console.log("[OAuth] Selected exchange URL:", exchangeUrl);
          console.log("[OAuth] Exchange URL selection logic:");
          console.log("  - authServerUrl:", authServerUrl);
          console.log("  - originalServerUrl:", originalServerUrl);
          console.log("  - serverUrl:", serverUrl);
          console.log("  - Final choice:", exchangeUrl);

          try {
            tokens = await exchangeAuthorization(exchangeUrl, {
              metadata,
              clientInformation: clientInfo,
              authorizationCode: code,
              codeVerifier: codeVerifier || undefined,
              redirectUri,
            });
            console.log("[OAuth] ✅ SDK exchange successful");
          } catch (exchangeError) {
            console.error("[OAuth] ❌ SDK exchange failed:", exchangeError);
            throw exchangeError;
          }
        }

        console.log("[OAuth] Token exchange complete!");
        console.log("[OAuth] Token response details:", {
          hasAccessToken: !!tokens.access_token,
          accessTokenLength: tokens.access_token?.length,
          hasRefreshToken: !!tokens.refresh_token,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
        });

        if (!tokens.access_token) {
          console.error("[OAuth] ❌ ERROR: No access token in exchange response!");
          console.error("[OAuth] Response keys:", Object.keys(tokens));
          console.error("[OAuth] Full response:", JSON.stringify(tokens, null, 2));
        } else {
          console.log("[OAuth] ✅ Access token received successfully");
          console.log(
            "[OAuth] Token preview (first 30 chars):",
            tokens.access_token.substring(0, 30) + "...",
          );
        }

        console.log("[OAuth] ========================================");
        console.log("[OAuth] OAuth flow completed successfully!");

        return NextResponse.json({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type || "Bearer",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }
  } catch (error) {
    console.error("[OAuth] ========================================");
    console.error("[OAuth] ❌ CRITICAL ERROR in OAuth flow");
    console.error("[OAuth] Error type:", error?.constructor?.name);
    console.error("[OAuth] Error message:", error instanceof Error ? error.message : error);
    console.error("[OAuth] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("[OAuth] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error("[OAuth] ========================================");

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth flow failed" },
      { status: 500 },
    );
  }
}
