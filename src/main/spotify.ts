import http from 'http';
import { shell } from 'electron';
import { DBStore } from './db';

export class SpotifyClient {
  private db: DBStore;
  private server: http.Server | null = null;
  private redirectUri = 'http://127.0.0.1:8888/callback';

  constructor(db: DBStore) {
    this.db = db;
  }

  // Get current access token, refreshing if expired
  private async getAccessToken(): Promise<string> {
    const settings = this.db.getSettings();
    if (!settings.clientId || !settings.clientSecret) {
      throw new Error('Spotify Client ID and Client Secret must be configured in Settings.');
    }

    if (!settings.refreshToken) {
      throw new Error('User is not authenticated. Please log in first.');
    }

    // Refresh if token is expired or expires in the next 60 seconds
    if (Date.now() >= settings.tokenExpiry - 60000) {
      console.log('Access token expired or expiring soon, refreshing...');
      await this.refreshTokens();
    }

    return this.db.getSettings().accessToken;
  }

  // Refresh OAuth tokens using client credentials and refresh token
  public async refreshTokens(): Promise<void> {
    const settings = this.db.getSettings();
    if (!settings.clientId || !settings.clientSecret || !settings.refreshToken) {
      throw new Error('Missing client credentials or refresh token for refresh.');
    }

    const authHeader = Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString('base64');
    
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: settings.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as any;
      this.db.updateSettings({
        accessToken: data.access_token,
        tokenExpiry: Date.now() + (data.expires_in * 1000),
        // If a new refresh token is returned, store it, otherwise keep the old one
        refreshToken: data.refresh_token || settings.refreshToken,
      });
      console.log('Access token refreshed successfully.');
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  // Start the OAuth flow
  public startAuthFlow(): Promise<{ success: boolean; username?: string }> {
    return new Promise((resolve, reject) => {
      const settings = this.db.getSettings();
      if (!settings.clientId || !settings.clientSecret) {
        return reject(new Error('Please set Spotify Client ID and Client Secret in Settings.'));
      }

      // Close existing server if running
      if (this.server) {
        this.server.close();
      }

      this.server = http.createServer(async (req, res) => {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
        if (reqUrl.pathname === '/callback') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;">
                  <h1>Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this tab now.</p>
                </body>
              </html>
            `);
            resolve({ success: false });
            this.closeServer();
            return;
          }

          if (code) {
            try {
              // Exchange code for tokens
              const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString('base64')}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  grant_type: 'authorization_code',
                  code: code,
                  redirect_uri: this.redirectUri,
                }),
              });

              if (!tokenResponse.ok) {
                throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
              }

              const tokenData = await tokenResponse.json() as any;
              
              // Fetch user profile info
              const profileResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                },
              });

              let username = 'Spotify User';
              if (profileResponse.ok) {
                const profileData = await profileResponse.json() as any;
                username = profileData.display_name || profileData.id;
              }

              // Update Settings
              this.db.updateSettings({
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiry: Date.now() + (tokenData.expires_in * 1000),
              });

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: sans-serif; background: #121212; color: #1DB954; text-align: center; padding-top: 50px;">
                    <h1>Successfully Logged In!</h1>
                    <p>Connected to Spotify as <strong>${username}</strong>.</p>
                    <p>You can close this tab and return to the app.</p>
                  </body>
                </html>
              `);

              resolve({ success: true, username });
            } catch (err: any) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;">
                    <h1>Authentication Error</h1>
                    <p>${err.message}</p>
                  </body>
                </html>
              `);
              reject(err);
            } finally {
              this.closeServer();
            }
          }
        }
      });

      this.server.listen(8888, () => {
        console.log('OAuth Callback server listening on port 8888...');
        
        // Open Spotify Auth URL in browser
        const scopes = [
          'user-read-private',
          'user-read-email',
          'playlist-read-private',
          'playlist-read-collaborative',
          'playlist-modify-public',
          'playlist-modify-private',
          'user-library-read'
        ].join(' ');

        const authUrl = `https://accounts.spotify.com/authorize?` + new URLSearchParams({
          response_type: 'code',
          client_id: settings.clientId,
          scope: scopes,
          redirect_uri: this.redirectUri,
          show_dialog: 'true'
        }).toString();

        shell.openExternal(authUrl);
      });

      // Timeout authentication after 3 minutes
      setTimeout(() => {
        if (this.server) {
          this.closeServer();
          reject(new Error('Authentication timed out. Please try again.'));
        }
      }, 180000);
    });
  }

  private closeServer(): void {
    if (this.server) {
      this.server.close(() => {
        console.log('OAuth Callback server closed.');
        this.server = null;
      });
    }
  }

  // Wrapper for requests handling rate limit retries and auth errors
  private async spotifyRequest(url: string, options: RequestInit = {}, _isRetryAfterRefresh = false): Promise<Response> {
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      const token = await this.getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const response = await fetch(url, { ...options, headers });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        console.warn(`Spotify API Rate Limited. Retrying after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries--;
        delay *= 2; // exponential backup fallback
        continue;
      }

      // On 401 or 403, try refreshing the token once and retry
      if ((response.status === 401 || response.status === 403) && !_isRetryAfterRefresh) {
        const errorBody = await response.text().catch(() => '(no body)');
        console.warn(`Spotify API returned ${response.status} for ${url}. Body: ${errorBody}`);
        console.log('Attempting token refresh and retry...');
        try {
          // Force-expire the token so getAccessToken will refresh
          this.db.updateSettings({ tokenExpiry: 0 });
          await this.refreshTokens();
          // Retry the same request once with the new token
          return await this.spotifyRequest(url, options, true);
        } catch (refreshErr) {
          console.error('Token refresh failed during 401/403 recovery:', refreshErr);
          // Return a synthetic error response so the caller gets a clear message
          throw new Error(`Spotify API returned ${response.status} and token refresh failed. Please re-connect your Spotify account in Settings. Refresh error: ${refreshErr}`);
        }
      }

      // Log non-ok responses for debugging
      if (!response.ok) {
        const cloned = response.clone();
        const body = await cloned.text().catch(() => '(no body)');
        console.error(`Spotify API error ${response.status} ${response.statusText} for ${url}: ${body}`);
      }

      return response;
    }

    throw new Error('Spotify API request failed after maximum rate limit retries.');
  }

  // Fetch all user playlists
  public async fetchUserPlaylists(): Promise<any[]> {
    let playlists: any[] = [];
    let url: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';

    while (url) {
      const response = await this.spotifyRequest(url);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch playlists (${response.status}): ${body || response.statusText}`);
      }

      const data = await response.json() as any;
      playlists = playlists.concat(data.items);
      url = data.next;
    }

    return playlists.filter(p => p !== null); // Filter out potential null entries
  }

  // Fetch all tracks in a playlist
  public async fetchPlaylistTracks(playlistId: string, progressCallback?: (percent: number) => void): Promise<any[]> {
    // Check if the playlistId is 'liked-songs' special key
    if (playlistId === 'liked-songs') {
      return this.fetchLikedSongs(progressCallback);
    }

    let tracks: any[] = [];
    // Use the new /items endpoint (the old /tracks endpoint returns 403 in dev mode)
    let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&fields=next,total,items(item(id,name,duration_ms,explicit,is_local,popularity,album(name,release_date),artists(name)))`;
    let fetched = 0;

    while (url) {
      const response = await this.spotifyRequest(url);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        if (response.status === 403) {
          throw new Error(`Spotify API limits in Development Mode prevent reading tracks from playlists you don't own. Please duplicate the playlist to your own Spotify account first.`);
        }
        throw new Error(`Failed to fetch tracks for playlist ${playlistId} (${response.status}): ${body || response.statusText}`);
      }

      const data = await response.json() as any;
      // Normalize: the new /items endpoint returns data under 'item' key, not 'track'
      const normalized = (data.items || []).map((entry: any) => {
        if (entry.item && !entry.track) {
          return { ...entry, track: entry.item };
        }
        return entry;
      });
      tracks = tracks.concat(normalized);
      fetched += (data.items || []).length;
      
      if (progressCallback && data.total > 0) {
        progressCallback(Math.round((fetched / data.total) * 100));
      }

      url = data.next;
    }

    // Filter out null track objects (sometimes happen for local tracks or deleted tracks)
    return tracks.filter(item => item && item.track);
  }

  // Fetch Liked Songs special endpoint
  private async fetchLikedSongs(progressCallback?: (percent: number) => void): Promise<any[]> {
    let tracks: any[] = [];
    let url: string | null = 'https://api.spotify.com/v1/me/tracks?limit=50';
    let fetched = 0;

    while (url) {
      const response = await this.spotifyRequest(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch liked songs: ${response.statusText}`);
      }

      const data = await response.json() as any;
      tracks = tracks.concat(data.items);
      fetched += data.items.length;

      if (progressCallback && data.total > 0) {
        progressCallback(Math.round((fetched / data.total) * 100));
      }

      url = data.next;
    }

    return tracks.filter(item => item && item.track);
  }

  // Create a new playlist
  public async createPlaylist(name: string, description: string = 'Created by UMP Manager'): Promise<any> {
    // First get current user ID
    const meResponse = await this.spotifyRequest('https://api.spotify.com/v1/me');
    if (!meResponse.ok) {
      throw new Error('Failed to fetch user profile to create playlist.');
    }
    const meData = await meResponse.json() as any;
    const userId = meData.id;

    // Create playlist
    const response = await this.spotifyRequest(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create playlist "${name}": ${response.statusText}`);
    }

    return await response.json();
  }

  // Add tracks to a playlist (in batches of 100)
  public async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    if (trackUris.length === 0) return;

    // Spotify only allows 100 tracks per request
    const batchSize = 100;
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      // Use the new /items endpoint
      const response = await this.spotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          uris: batch
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add tracks batch to playlist ${playlistId}: ${response.statusText}`);
      }
      
      // Minor delay to protect rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Remove tracks from a playlist (in batches of 100)
  public async removeTracksFromPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    if (trackUris.length === 0) return;

    const batchSize = 100;
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      // Use the new /items endpoint
      const response = await this.spotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
        method: 'DELETE',
        body: JSON.stringify({
          tracks: batch.map(uri => ({ uri }))
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to remove tracks batch from playlist ${playlistId}: ${response.statusText}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Get current user display name
  public async getUserInfo(): Promise<{ id: string; display_name: string; product: string; image: string }> {
    const response = await this.spotifyRequest('https://api.spotify.com/v1/me');
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Failed to fetch user profile (${response.status}): ${body || response.statusText}`);
    }
    const data = await response.json() as any;
    return {
      id: data.id,
      display_name: data.display_name || data.id,
      product: data.product || 'unknown',
      image: data.images && data.images.length > 0 ? data.images[0].url : ''
    };
  }
}
