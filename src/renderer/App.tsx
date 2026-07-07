import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Music, RefreshCw, Clock, 
  Copy, History, Settings, HelpCircle, 
  Wifi, WifiOff, Loader, AlertTriangle, CheckCircle2, X 
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import PlaylistBrowser from './components/PlaylistBrowser';
import SyncManager from './components/SyncManager';
import SyncProfiles from './components/SyncProfiles';
import HistoryViewer from './components/HistoryViewer';
import SettingsView from './components/Settings';
import HelpView from './components/Help';

type Tab = 'dashboard' | 'playlists' | 'sync' | 'schedules' | 'profiles' | 'history' | 'settings' | 'help';

interface Alert {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isOnline, setIsOnline] = useState(true);
  const [alert, setAlert] = useState<Alert | null>(null);
  
  // Progress modal state
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ step: '', percent: 0 });

  useEffect(() => {
    // Get initial online state
    window.api.getIsOnline().then(setIsOnline);

    // Listen to network changes
    const unsubConnectivity = window.api.onConnectivityChanged((online) => {
      setIsOnline(online);
      triggerAlert({
        type: online ? 'success' : 'warning',
        message: online ? 'Back online! Reconnected to Spotify.' : 'Working offline. Syncs will be queued.'
      });
    });

    // Listen to progress updates
    const unsubProgress = window.api.onSyncProgress((status) => {
      setSyncing(true);
      setProgress(status);
      if (status.percent >= 100) {
        setTimeout(() => setSyncing(false), 2000);
      }
    });

    return () => {
      unsubConnectivity();
      unsubProgress();
    };
  }, []);

  const triggerAlert = (newAlert: Alert) => {
    setAlert(newAlert);
    if (newAlert.type === 'success') {
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleCancelSync = () => {
    // For now we just dismiss, main process check is added as nice-to-have
    setSyncing(false);
    triggerAlert({ type: 'warning', message: 'Sync cancellation requested.' });
  };

  // Nav Items definition
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'playlists', label: 'Playlists', icon: Music },
    { id: 'sync', label: 'Sync Workspace', icon: RefreshCw },
    { id: 'profiles', label: 'Sync Profiles', icon: Copy },
    { id: 'history', label: 'History & Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help Guide', icon: HelpCircle },
  ] as const;

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} triggerAlert={triggerAlert} />;
      case 'playlists':
        return <PlaylistBrowser triggerAlert={triggerAlert} />;
      case 'sync':
        return <SyncManager triggerAlert={triggerAlert} />;
      case 'profiles':
        return <SyncProfiles triggerAlert={triggerAlert} setActiveTab={setActiveTab} />;
      case 'history':
        return <HistoryViewer triggerAlert={triggerAlert} />;
      case 'settings':
        return <SettingsView triggerAlert={triggerAlert} />;
      case 'help':
        return <HelpView />;
      default:
        return <Dashboard setActiveTab={setActiveTab} triggerAlert={triggerAlert} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Banner (Alerts) */}
      {alert && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: alert.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : alert.type === 'error' ? 'rgba(244, 63, 94, 0.95)' : 'rgba(245, 158, 11, 0.95)',
            color: alert.type === 'success' ? '#ffffff' : '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {alert.type === 'success' && <CheckCircle2 size={18} />}
          {alert.type === 'warning' && <AlertTriangle size={18} />}
          {alert.type === 'error' && <AlertTriangle size={18} />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{alert.message}</span>
          <button 
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <aside 
          style={{
            width: '240px',
            background: 'var(--sidebar-gradient)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            boxSizing: 'border-box'
          }}
        >
          {/* App Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '32px', paddingLeft: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={16} color="#000000" strokeWidth={3} />
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Spot Playmaker
              </h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>v1.0.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'var(--bg-glass-hover)' : 'transparent',
                    color: isActive ? 'var(--spotify-green)' : 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? 'inset 0 0 0 1px var(--border-color)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Work Area */}
        <main 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          {/* Header Bar */}
          <header 
            style={{
              height: '48px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              WebkitAppRegion: 'drag' // Make window draggable on macOS
            } as any}
          >
            <div style={{ fontWeight: 600, letterSpacing: '0.5px' }}>
              {activeTab.toUpperCase()}
            </div>
            
            {/* Online Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' } as any}>
              <div 
                className={isOnline ? 'glow-green' : 'glow-red'}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)'
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                {isOnline ? 'Online mode' : 'Offline mode'}
              </span>
            </div>
          </header>

          {/* View Container */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }} className="scroller">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Sync Progress Window Modal */}
      {syncing && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            className="glass-panel" 
            style={{
              width: '450px',
              padding: '32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20
            }}
          >
            <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={36} color="var(--spotify-green)" style={{ animation: 'spin 2s linear infinite' }} />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Synchronizing Playlists</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{progress.step || 'Starting...'}</p>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  background: 'var(--accent-gradient)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {progress.percent}% Completed
            </div>

            <button 
              className="glass-button" 
              onClick={handleCancelSync}
              style={{ marginTop: '12px', padding: '8px 16px', fontSize: '12px' }}
            >
              Cancel Safely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
