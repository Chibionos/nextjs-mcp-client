interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  serverUrl: string;
  serverName: string;
}

class TokenStorage {
  private readonly STORAGE_KEY = 'mcp_oauth_tokens';

  /**
   * Store a token for a server
   */
  storeToken(serverName: string, serverUrl: string, accessToken: string, expiresIn?: number, refreshToken?: string): void {
    try {
      const tokens = this.getAllTokens();

      tokens[serverName] = {
        accessToken,
        refreshToken,
        expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
        serverUrl,
        serverName,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
        console.log(`[TokenStorage] Stored token for ${serverName}`);
      }
    } catch (error) {
      console.error('[TokenStorage] Failed to store token:', error);
    }
  }

  /**
   * Get a stored token for a server
   */
  getToken(serverName: string): StoredToken | null {
    try {
      const tokens = this.getAllTokens();
      const token = tokens[serverName];

      if (!token) {
        return null;
      }

      // Check if token is expired
      if (token.expiresAt && token.expiresAt < Date.now()) {
        console.log(`[TokenStorage] Token for ${serverName} is expired`);
        this.removeToken(serverName);
        return null;
      }

      return token;
    } catch (error) {
      console.error('[TokenStorage] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Remove a token for a server
   */
  removeToken(serverName: string): void {
    try {
      const tokens = this.getAllTokens();
      delete tokens[serverName];

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
        console.log(`[TokenStorage] Removed token for ${serverName}`);
      }
    } catch (error) {
      console.error('[TokenStorage] Failed to remove token:', error);
    }
  }

  /**
   * Get all stored tokens
   */
  private getAllTokens(): Record<string, StoredToken> {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[TokenStorage] Failed to parse stored tokens:', error);
      return {};
    }
  }

  /**
   * Clear all stored tokens
   */
  clearAll(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[TokenStorage] Cleared all tokens');
      }
    } catch (error) {
      console.error('[TokenStorage] Failed to clear tokens:', error);
    }
  }
}

export const tokenStorage = new TokenStorage();