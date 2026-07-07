import React, { useState, useEffect } from 'react';
import { 
  Copy, Play, Calendar, Trash2, Edit3, 
  Clock, Plus, Check, X, ShieldAlert 
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  sources: string[];
  destinations: string[];
  mode: 'copy' | 'mirror' | 'merge' | 'update_only';
  filters: any;
  lastRun: string | null;
}

interface Playlist {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  profileId: string;
  interval: 'hourly' | 'daily' | 'weekly' | 'startup' | 'manual';
  lastRun: string | null;
  nextRun: string | null;
}

interface SyncProfilesProps {
  triggerAlert: (alert: { type: 'success' | 'error' | 'warning'; message: string }) => void;
  setActiveTab: (tab: any) => void;
}

export default function SyncProfiles({ triggerAlert, setActiveTab }: SyncProfilesProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Scheduling state
  const [schedulingProfile, setSchedulingProfile] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'hourly' | 'daily' | 'weekly' | 'startup' | 'manual'>('manual');

  const loadData = async () => {
    try {
      const cachedProfiles = await window.api.getProfiles();
      setProfiles(cachedProfiles);

      const cachedPlaylists = await window.api.getPlaylists();
      setPlaylists(cachedPlaylists);

      const cachedSchedules = await window.api.getSchedules();
      setSchedules(cachedSchedules);
    } catch (err: any) {
      console.error(err);
      triggerAlert({ type: 'error', message: 'Failed to load profile settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteProfile = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the profile "${name}"? This will also remove any related scheduler configurations.`)) {
      try {
        const updated = await window.api.deleteProfile(id);
        setProfiles(updated);
        triggerAlert({ type: 'success', message: `Deleted profile "${name}" successfully.` });
        loadData();
      } catch (err: any) {
        triggerAlert({ type: 'error', message: 'Failed to delete profile.' });
      }
    }
  };

  const handleRunProfile = async (id: string, name: string) => {
    try {
      triggerAlert({ type: 'warning', message: `Executing sync for profile "${name}"...` });
      await window.api.executeSync(id);
      triggerAlert({ type: 'success', message: `Successfully completed sync for "${name}"!` });
      loadData();
    } catch (err: any) {
      triggerAlert({ type: 'error', message: err.message });
    }
  };

  // Scheduling methods
  const handleOpenSchedule = (profileId: string) => {
    const existing = schedules.find(s => s.profileId === profileId);
    setSchedulingProfile(profileId);
    setSelectedInterval(existing ? existing.interval : 'manual');
  };

  const handleSaveSchedule = async () => {
    if (!schedulingProfile) return;

    try {
      const existing = schedules.find(s => s.profileId === schedulingProfile);
      const scheduleId = existing ? existing.id : Math.random().toString(36).substring(2, 11);

      if (selectedInterval === 'manual') {
        // If set to manual, remove any active schedule
        if (existing) {
          await window.api.deleteSchedule(existing.id);
        }
        triggerAlert({ type: 'success', message: 'Schedule updated to manual.' });
      } else {
        const newSchedule = {
          id: scheduleId,
          profileId: schedulingProfile,
          interval: selectedInterval,
          lastRun: existing?.lastRun || null,
          nextRun: null // Main process will calculate this automatically on save
        };
        await window.api.saveSchedule(newSchedule);
        triggerAlert({ type: 'success', message: `Schedule successfully updated to: ${selectedInterval}` });
      }

      setSchedulingProfile(null);
      loadData();
    } catch (err: any) {
      triggerAlert({ type: 'error', message: 'Failed to update schedule.' });
    }
  };

  // Map IDs to Names helper
  const getPlaylistNames = (ids: string[]): string => {
    return ids
      .map(id => {
        if (id === 'liked-songs') return 'Liked Songs';
        const found = playlists.find(p => p.id === id);
        return found ? found.name : 'Unknown Playlist';
      })
      .join(', ');
  };

  const getProfileScheduleText = (profileId: string): string => {
    const found = schedules.find(s => s.profileId === profileId);
    if (!found || found.interval === 'manual') {
      return 'Manual execution only';
    }
    return `Scheduled: ${found.interval.toUpperCase()}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading Profiles...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Saved Sync Profiles</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Run saved configurations with one click or set up background automated intervals.
          </p>
        </div>
        <button 
          className="glass-button primary" 
          onClick={() => setActiveTab('sync')}
        >
          <Plus size={16} />
          Create New Profile
        </button>
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Copy size={48} style={{ strokeWidth: 1.5, marginBottom: '16px', color: 'rgba(255,255,255,0.05)' }} />
          <p style={{ fontSize: '14px' }}>No profiles saved yet.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Go to the Sync Workspace and select playlists to save your first reusable profile.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {profiles.map((profile) => {
            const hasSchedule = schedules.some(s => s.profileId === profile.id && s.interval !== 'manual');
            
            return (
              <div 
                key={profile.id} 
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative'
                }}
              >
                {/* Card Title */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '2px' }}>{profile.name}</h4>
                  <span style={{ fontSize: '10px', color: 'var(--spotify-green)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {profile.mode.replace('_', ' ')} MODE
                  </span>
                </div>

                {/* Playlists details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '2px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>SOURCES</strong>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                      {getPlaylistNames(profile.sources)}
                    </div>
                  </div>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '2px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>DESTINATIONS</strong>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                      {getPlaylistNames(profile.destinations)}
                    </div>
                  </div>
                </div>

                {/* Scheduling Details */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '11px', 
                    color: hasSchedule ? 'var(--spotify-green)' : 'var(--text-muted)',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontWeight: 600
                  }}
                >
                  <Clock size={12} />
                  <span>{getProfileScheduleText(profile.id)}</span>
                </div>

                {/* Execution / Date Details */}
                {profile.lastRun && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Last Sync: {new Date(profile.lastRun).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}

                {/* Card Operations Footer */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
                  <button 
                    className="glass-button primary" 
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                    onClick={() => handleRunProfile(profile.id, profile.name)}
                  >
                    <Play size={12} fill="currentColor" />
                    Run Sync
                  </button>
                  
                  <button 
                    className="glass-button" 
                    style={{ padding: '8px 12px' }}
                    onClick={() => handleOpenSchedule(profile.id)}
                    title="Configure Schedule"
                  >
                    <Calendar size={14} />
                  </button>

                  <button 
                    className="glass-button" 
                    style={{ padding: '8px 12px', color: 'var(--danger)' }}
                    onClick={() => handleDeleteProfile(profile.id, profile.name)}
                    title="Delete Profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scheduler Modal Dialogue */}
      {schedulingProfile && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000
          }}
        >
          <div 
            className="glass-panel animate-fade-in"
            style={{ width: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div className="flex-between">
              <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Schedule Sync Job</h3>
              <button 
                className="glass-button" 
                style={{ padding: 4, borderRadius: '50%' }}
                onClick={() => setSchedulingProfile(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                SELECT SYNC INTERVAL
              </label>
              
              <select 
                className="glass-select"
                style={{ width: '100%' }}
                value={selectedInterval}
                onChange={(e) => setSelectedInterval(e.target.value as any)}
              >
                <option value="manual">Manual (No background schedule)</option>
                <option value="startup">On startup (Executes once when app launches)</option>
                <option value="hourly">Hourly (Runs once every hour)</option>
                <option value="daily">Daily (Runs once every 24 hours)</option>
                <option value="weekly">Weekly (Runs once every 7 days)</option>
              </select>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Note: Background schedules execute only when this application is running. If you are offline when a scheduled run is due, the job will be automatically queued and executed when your internet returns.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button className="glass-button" onClick={() => setSchedulingProfile(null)}>
                Cancel
              </button>
              <button className="glass-button primary" onClick={handleSaveSchedule}>
                <Check size={14} />
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
