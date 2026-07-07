import React, { useState, useEffect } from 'react';
import { 
  Music, HardDrive, RefreshCw, Zap, ShieldAlert, 
  ExternalLink, Calendar, RefreshCcw, Star 
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: any) => void;
  triggerAlert: (alert: { type: 'success' | 'error' | 'warning'; message: string }) => void;
}

export default function Dashboard({ setActiveTab, triggerAlert }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  const loadData = async () => {
    try {
      const online = await window.api.getIsOnline();
      setIsOnline(online);

      const cachedPlaylists = await window.api.getPlaylists();
      setPlaylists(cachedPlaylists);

      const cachedProfiles = await window.api.getProfiles();
      setProfiles(cachedProfiles);

      const cachedSchedules = await window.api.getSchedules();
      setSchedules(cachedSchedules);

      const cachedLogs = await window.api.getLogs();
      setLogs(cachedLogs);

      const cachedQueue = await window.api.getQueue();
      setQueue(cachedQueue);

      if (online) {
        // Try fetching fresh user profile info
        try {
          const user = await window.api.getUserInfo();
          setUserInfo(user);
        } catch (e) {
          console.warn('Failed to fetch user info, using local settings:', e);
        }
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = window.api.onDataUpdated(loadData);
    return unsub;
  }, []);

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear the locally cached playlist track lists? This will require reloading them next time.')) {
      setClearingCache(true);
      try {
        await window.api.clearAllCache();
        triggerAlert({ type: 'success', message: 'Local cache cleared successfully.' });
        loadData();
      } catch (err: any) {
        triggerAlert({ type: 'error', message: `Clear cache failed: ${err.message}` });
      } finally {
        setClearingCache(false);
      }
    }
  };

  const handleQuickRun = async (profileId: string, profileName: string) => {
    try {
      triggerAlert({ type: 'warning', message: `Executing sync profile: ${profileName}...` });
      await window.api.executeSync(profileId);
      triggerAlert({ type: 'success', message: `Successfully completed sync for ${profileName}!` });
      loadData();
    } catch (err: any) {
      triggerAlert({ type: 'error', message: err.message });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 2s linear infinite', marginRight: '10px' }} />
        <span>Loading Dashboard...</span>
      </div>
    );
  }

  // Derived stats
  const totalCachedSongs = playlists.reduce((acc, p) => acc + p.trackCount, 0);
  const favoritePlaylists = playlists.filter(p => p.isFavorite);
  const lastSyncLog = logs.find(l => l.status === 'success');
  const activeSchedulesCount = schedules.filter(s => s.interval !== 'manual').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner */}
      <div 
        className="glass-panel" 
        style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {userInfo?.image ? (
            <img 
              src={userInfo.image} 
              alt="Avatar" 
              style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--spotify-green)', boxShadow: '0 0 10px rgba(29,185,84,0.3)' }} 
            />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={24} color="#000000" />
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>
              Welcome back, {userInfo?.display_name || 'Spotify Explorer'}!
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Spotify product tier: <strong style={{ color: 'var(--spotify-green)', textTransform: 'capitalize' }}>{userInfo?.product || 'Standard'}</strong>
            </p>
          </div>
        </div>

        <button 
          className="glass-button primary"
          onClick={() => setActiveTab('sync')}
          style={{ padding: '12px 24px' }}
        >
          <Zap size={16} />
          New Sync Workspace
        </button>
      </div>

      {/* Grid Stats */}
      <div className="dashboard-grid">
        {/* Card 1: Playlists Count */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(29, 185, 84, 0.1)', borderRadius: '12px', height: '48px', color: 'var(--spotify-green)' }}>
            <Music size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>PLAYLISTS DISCOVERED</span>
            <span style={{ fontSize: '24px', fontWeight: 800 }}>{playlists.length}</span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {favoritePlaylists.length} favorites marked
            </span>
          </div>
        </div>

        {/* Card 2: Song Count */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', height: '48px', color: 'var(--accent-indigo)' }}>
            <HardDrive size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>DATABASE CACHE</span>
            <span style={{ fontSize: '24px', fontWeight: 800 }}>{totalCachedSongs.toLocaleString()}</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tracks cached</span>
              <button 
                onClick={handleClearCache}
                disabled={clearingCache}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Schedules */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', height: '48px', color: 'var(--accent-purple)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>AUTOMATED TASKS</span>
            <span style={{ fontSize: '24px', fontWeight: 800 }}>{activeSchedulesCount}</span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {queue.length} jobs in offline queue
            </span>
          </div>
        </div>

        {/* Card 4: Last Sync */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', height: '48px', color: 'var(--warning)' }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>LAST EXECUTION</span>
            <span style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginTop: '6px' }}>
              {lastSyncLog ? new Date(lastSyncLog.timestamp).toLocaleDateString() + ' ' + new Date(lastSyncLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {lastSyncLog ? `Synced +${lastSyncLog.addedCount} songs` : 'No sync recorded yet'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left column: Recent Logs */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Sync Activity</h3>
            <button 
              className="glass-button" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setActiveTab('history')}
            >
              See Full Logs
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No sync activity logged. Prepare a workspace to run your first sync!
              </div>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div 
                  key={log.id} 
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: log.status === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{log.profileName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {log.sources.join(', ')} → {log.destinations.join(', ')}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {log.status === 'success' ? `+${log.addedCount}` : 'Failed'}
                    </span>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Quick Profiles list */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Quick Run</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profiles.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Create sync profiles to trigger them with one click.
              </div>
            ) : (
              profiles.slice(0, 4).map((prof) => (
                <div 
                  key={prof.id} 
                  className="glass-panel"
                  style={{
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    backgroundColor: 'rgba(255,255,255,0.01)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700 }}>{prof.name}</h4>
                    <span style={{ fontSize: '10px', color: 'var(--spotify-green)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {prof.mode.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      className="glass-button primary" 
                      style={{ flex: 1, padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
                      onClick={() => handleQuickRun(prof.id, prof.name)}
                    >
                      <Zap size={12} />
                      Sync Now
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {profiles.length > 4 && (
              <button 
                className="glass-button" 
                style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                onClick={() => setActiveTab('profiles')}
              >
                View All Profiles
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
