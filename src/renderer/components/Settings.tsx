import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Save, Link2, Key, Info, HelpCircle } from 'lucide-react';

interface SettingsData {
  clientId: string;
  clientSecret: string;
  theme: 'light' | 'dark' | 'system';
}

interface SettingsViewProps {
  triggerAlert: (alert: { type: 'success' | 'error' | 'warning'; message: string }) => void;
}

export default function Settings({ triggerAlert }: SettingsViewProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Login states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const loadSettings = async () => {
    try {
      const settings = await window.api.getSettings();
      setClientId(settings.clientId || '');
      setClientSecret(settings.clientSecret || '');
      setTheme(settings.theme || 'system');

      const online = await window.api.getIsOnline();
      setIsOnline(online);

      if (settings.refreshToken) {
        setIsAuthenticated(true);
        if (online) {
          try {
            const user = await window.api.getUserInfo();
            setSpotifyUser(user.display_name);
          } catch (e) {
            setSpotifyUser('Authenticated User');
          }
        } else {
          setSpotifyUser('Cached User (Offline)');
        }
      } else {
        setIsAuthenticated(false);
        setSpotifyUser(null);
      }
    } catch (err) {
      console.error(err);
      triggerAlert({ type: 'error', message: 'Failed to load configurations.' });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      triggerAlert({ type: 'error', message: 'Client ID and Client Secret cannot be empty.' });
      return;
    }

    setSaving(true);
    try {
      await window.api.updateSettings({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      });
      triggerAlert({ type: 'success', message: 'Spotify developer credentials saved successfully.' });
      loadSettings();
    } catch (err: any) {
      triggerAlert({ type: 'error', message: 'Failed to save credentials.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSpotifyConnect = async () => {
    if (!clientId || !clientSecret) {
      triggerAlert({ type: 'error', message: 'Please save Spotify Client ID and Client Secret before connecting.' });
      return;
    }

    triggerAlert({ type: 'warning', message: 'Opening browser for Spotify sign-in. Please log in there...' });
    try {
      const result = await window.api.login();
      if (result.success) {
        triggerAlert({ type: 'success', message: `Connected to Spotify as ${result.username}! Caching playlists...` });
        await window.api.fetchPlaylists();
        triggerAlert({ type: 'success', message: 'Playlists cached successfully.' });
        loadSettings();
      } else {
        triggerAlert({ type: 'error', message: 'Spotify login callback returned failure.' });
      }
    } catch (err: any) {
      triggerAlert({ type: 'error', message: err.message || 'Login flow aborted.' });
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    try {
      await window.api.updateSettings({ theme: newTheme });
      localStorage.setItem('theme', newTheme);
      
      // Update DOM class immediately
      if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      triggerAlert({ type: 'success', message: `Theme switched to: ${newTheme}` });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      
      {/* Spotify Connection Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="var(--spotify-green)" />
          Spotify Authorization Status
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Connect this app with your personal Spotify account using your developer credentials.
        </p>

        <div 
          style={{
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div 
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: isAuthenticated ? 'var(--success)' : 'var(--danger)',
                  boxShadow: isAuthenticated ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                {isAuthenticated ? 'Authenticated & Connected' : 'Disconnected'}
              </span>
            </div>
            {isAuthenticated && spotifyUser && (
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Account User: <strong>{spotifyUser}</strong>
              </span>
            )}
          </div>

          <button 
            className="glass-button primary" 
            onClick={handleSpotifyConnect}
            disabled={!isOnline}
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            {isAuthenticated ? 'Re-Connect Account' : 'Connect Spotify Account'}
          </button>
        </div>
      </div>

      {/* API Configuration Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={18} color="var(--accent-indigo)" />
          Spotify Developer Credentials
        </h3>
        
        {/* Instructions Alert */}
        <div 
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '11px',
            lineHeight: '1.5',
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '4px' }}>
            <Info size={14} color="var(--accent-indigo)" />
            How to get Developer Credentials?
          </div>
          1. Go to the <a href="https://developer.spotify.com/dashboard" target="_blank" style={{ color: 'var(--spotify-green)', fontWeight: 600 }}>Spotify Developer Dashboard</a>.<br/>
          2. Log in and click <strong>Create App</strong>.<br/>
          3. Set App Name and add <strong>Redirect URI</strong>: <code style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>http://127.0.0.1:8888/callback</code>.<br/>
          4. Check the boxes and click <strong>Save</strong>. Open <strong>Settings</strong> inside your new App to copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              CLIENT ID
            </label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Enter your Spotify Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              CLIENT SECRET
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showSecret ? 'text' : 'password'} 
                className="glass-input" 
                placeholder="Enter your Spotify Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
              <button 
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex'
                }}
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button 
          className="glass-button" 
          onClick={handleSaveCredentials}
          disabled={saving}
          style={{ alignSelf: 'flex-start', padding: '10px 20px', fontWeight: 600 }}
        >
          <Save size={14} />
          Save Credentials
        </button>
      </div>

      {/* Theme Toggles Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Appearance</h3>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['system', 'dark', 'light'] as const).map((t) => (
            <button
              key={t}
              className="glass-button"
              onClick={() => handleThemeChange(t)}
              style={{
                flex: 1,
                padding: '12px',
                fontWeight: 700,
                textTransform: 'capitalize',
                backgroundColor: theme === t ? 'rgba(29, 185, 84, 0.08)' : 'var(--bg-glass)',
                borderColor: theme === t ? 'var(--spotify-green)' : 'var(--border-color)'
              }}
            >
              {t} Mode
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
