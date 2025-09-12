import { OAuthConfig, OAuthState, OAuthTokenResponse, AuthResult } from '@/lib/types/oauth';

/**
 * OAuth Service for handling authentication flows
 */
export class OAuthService {
  private static instance: OAuthService;
  private pendingStates: Map<string, OAuthState> = new Map();
  private authWindows: Map<string, Window> = new Map();

  private constructor() {}

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private async generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const verifier = this.generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return { verifier, challenge };
  }

  /**
   * Generate random string for state and PKCE
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  /**
   * Start OAuth authentication flow
   */
  async startAuthFlow(serverName: string, config: OAuthConfig): Promise<AuthResult> {
    try {
      // Generate state for CSRF protection
      const state = this.generateRandomString(32);
      
      // Generate PKCE if enabled
      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;
      
      if (config.usePKCE) {
        const pkce = await this.generatePKCE();
        codeVerifier = pkce.verifier;
        codeChallenge = pkce.challenge;
      }

      // Store state for verification
      const oauthState: OAuthState = {
        state,
        codeVerifier,
        codeChallenge,
        serverName,
        timestamp: Date.now(),
      };
      this.pendingStates.set(state, oauthState);

      // Build authorization URL
      const authUrl = new URL(config.authorizationEndpoint);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirectUri);
      authUrl.searchParams.set('response_type', config.responseType || 'code');
      authUrl.searchParams.set('state', state);
      
      if (config.scope) {
        authUrl.searchParams.set('scope', config.scope);
      }
      
      if (codeChallenge) {
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
      }

      // Open authentication popup
      return await this.openAuthPopup(serverName, authUrl.toString(), config);
      
    } catch (error) {
      console.error('OAuth flow error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Open authentication popup window
   */
  private async openAuthPopup(
    serverName: string, 
    authUrl: string, 
    config: OAuthConfig
  ): Promise<AuthResult> {
    return new Promise((resolve) => {
      // Calculate popup position
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Close any existing popup for this server
      const existingWindow = this.authWindows.get(serverName);
      if (existingWindow && !existingWindow.closed) {
        existingWindow.close();
      }

      // Open new popup
      const authWindow = window.open(
        authUrl,
        `mcp-auth-${serverName}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!authWindow) {
        resolve({
          success: false,
          error: 'Failed to open authentication window. Please check popup blockers.',
        });
        return;
      }

      this.authWindows.set(serverName, authWindow);

      // Poll for window closure or completion
      const pollInterval = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(pollInterval);
          this.authWindows.delete(serverName);
          
          // Check if we have a pending auth completion
          const pendingResult = this.getPendingAuthResult(serverName);
          if (pendingResult) {
            resolve(pendingResult);
          } else {
            resolve({
              success: false,
              error: 'Authentication window was closed',
            });
          }
        }
      }, 1000);

      // Listen for messages from callback page
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth-callback') {
          const { code, state, error } = event.data;
          
          if (error) {
            window.removeEventListener('message', messageHandler);
            clearInterval(pollInterval);
            authWindow.close();
            this.authWindows.delete(serverName);
            
            resolve({
              success: false,
              error: error,
            });
            return;
          }

          // Verify state
          const oauthState = this.pendingStates.get(state);
          if (!oauthState || oauthState.serverName !== serverName) {
            resolve({
              success: false,
              error: 'Invalid state parameter',
            });
            return;
          }

          // Exchange code for token
          const tokenResult = await this.exchangeCodeForToken(
            code,
            config,
            oauthState.codeVerifier
          );

          window.removeEventListener('message', messageHandler);
          clearInterval(pollInterval);
          authWindow.close();
          this.authWindows.delete(serverName);
          this.pendingStates.delete(state);

          resolve(tokenResult);
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    code: string,
    config: OAuthConfig,
    codeVerifier?: string
  ): Promise<AuthResult> {
    try {
      const response = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          tokenEndpoint: config.tokenEndpoint,
          grantType: config.grantType || 'authorization_code',
          codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data: OAuthTokenResponse = await response.json();

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    config: OAuthConfig
  ): Promise<AuthResult> {
    try {
      const response = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tokenEndpoint: config.tokenEndpoint,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data: OAuthTokenResponse = await response.json();

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Handle OAuth callback
   */
  handleCallback(params: URLSearchParams): void {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Send message to opener window
    if (window.opener) {
      window.opener.postMessage({
        type: 'oauth-callback',
        code,
        state,
        error: error ? `${error}: ${errorDescription || ''}` : undefined,
      }, window.location.origin);
      
      // Close the callback window
      window.close();
    }
  }

  /**
   * Get pending auth result (for handling window close)
   */
  private getPendingAuthResult(serverName: string): AuthResult | null {
    // This would be populated by successful auth callbacks
    // For now, return null to indicate no result
    return null;
  }

  /**
   * Clear authentication for a server
   */
  clearAuth(serverName: string): void {
    const authWindow = this.authWindows.get(serverName);
    if (authWindow && !authWindow.closed) {
      authWindow.close();
    }
    this.authWindows.delete(serverName);
    
    // Clear any pending states for this server
    for (const [state, oauthState] of this.pendingStates.entries()) {
      if (oauthState.serverName === serverName) {
        this.pendingStates.delete(state);
      }
    }
  }
}