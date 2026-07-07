import React, { useState, useEffect } from 'react';
import { 
  Music, ArrowRight, Settings2, ShieldAlert, 
  HelpCircle, Eye, Zap, AlertTriangle, X, Check, Save 
} from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  owner: string;
  image: string;
  trackCount: number;
  isFavorite: boolean;
}

interface SyncManagerProps {
  triggerAlert: (alert: { type: 'success' | 'error' | 'warning'; message: string }) => void;
}

export default function SyncManager({ triggerAlert }: SyncManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);

  // Search
  const [sourceSearch, setSourceSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');

  // Configs
  const [syncMode, setSyncMode] = useState<'copy' | 'mirror' | 'merge' | 'update_only'>('update_only');
  const [showFilters, setShowFilters] = useState(false);
  const [profileName, setProfileName] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    likedOnly: false,
    excludeExplicit: false,
    excludePodcasts: false,
    excludeLocal: false,
    minPopularity: 0,
    maxDurationMs: 0,
    releaseYearStart: '',
    releaseYearEnd: ''
  });

  // Simulation Preview State
  const [previewData, setPreviewData] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [confirmExecute, setConfirmExecute] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      let data = await window.api.getPlaylists();
      const settings = await window.api.getSettings();
      const online = await window.api.getIsOnline();

      if (data.length === 0 && online && settings.refreshToken) {
        triggerAlert({ type: 'warning', message: 'First-time load: caching playlists from Spotify...' });
        data = await window.api.fetchPlaylists();
      }
      setPlaylists(data);
    } catch (err: any) {
      console.error(err);
      triggerAlert({ type: 'error', message: 'Failed to load playlists.' });
    } finally {
      setLoading(false);
    }
  };

  // Select Utilities
  const handleToggleSource = (id: string) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleDest = (id: string) => {
    setSelectedDestinations(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllSources = (filtered: Playlist[]) => {
    const ids = filtered.map(p => p.id);
    setSelectedSources(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllSources = (filtered: Playlist[]) => {
    const ids = filtered.map(p => p.id);
    setSelectedSources(prev => prev.filter(x => !ids.includes(x)));
  };

  const selectFavoriteSources = () => {
    const favIds = playlists.filter(p => p.isFavorite).map(p => p.id);
    setSelectedSources(prev => Array.from(new Set([...prev, ...favIds])));
  };

  const selectAllDests = (filtered: Playlist[]) => {
    const ids = filtered.map(p => p.id);
    setSelectedDestinations(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllDests = (filtered: Playlist[]) => {
    const ids = filtered.map(p => p.id);
    setSelectedDestinations(prev => prev.filter(x => !ids.includes(x)));
  };

  // Filter lists based on inputs
  const filteredSourcesList = playlists.filter(p => 
    p.name.toLowerCase().includes(sourceSearch.toLowerCase())
  );

  const filteredDestsList = playlists.filter(p => 
    // Exclude 'liked-songs' special key from destinations (Spotify doesn't allow adding to Liked Songs playlist via normal endpoint)
    p.id !== 'liked-songs' && p.name.toLowerCase().includes(destSearch.toLowerCase())
  );

  // Run Dry Run Simulation
  const handleSimulate = async () => {
    if (selectedSources.length === 0) {
      triggerAlert({ type: 'error', message: 'Please select at least one source playlist.' });
      return;
    }
    if (selectedDestinations.length === 0) {
      triggerAlert({ type: 'error', message: 'Please select at least one destination playlist.' });
      return;
    }

    setSimulating(true);
    try {
      const mockProfile = {
        id: 'simulation-temp',
        name: 'Simulation Run',
        sources: selectedSources,
        destinations: selectedDestinations,
        mode: syncMode,
        filters: {
          ...filters,
          maxDurationMs: filters.maxDurationMs * 1000 // Convert seconds to ms
        },
        lastRun: null
      };

      const result = await window.api.previewSync(mockProfile);
      setPreviewData(result);
      setConfirmExecute(false); // Reset confirmation checkbox
    } catch (err: any) {
      triggerAlert({ type: 'error', message: `Simulation failed: ${err.message}` });
    } finally {
      setSimulating(false);
    }
  };

  // Execute actual Sync
  const handleExecuteSync = async () => {
    if (!confirmExecute) return;
    
    // First save profile (so the execute handler can load it)
    const activeProfileName = profileName.trim() || `Sync Workspace ${new Date().toLocaleDateString()}`;
    const profileId = Math.random().toString(36).substring(2, 11);
    
    try {
      const newProfile = {
        id: profileId,
        name: activeProfileName,
        sources: selectedSources,
        destinations: selectedDestinations,
        mode: syncMode,
        filters: {
          ...filters,
          maxDurationMs: filters.maxDurationMs * 1000
        },
        lastRun: null
      };

      // Save to profiles list
      await window.api.saveProfile(newProfile);
      
      // Close preview modal first to let global loader overlay render
      setPreviewData(null);
      
      // Trigger execution
      await window.api.executeSync(profileId);
      triggerAlert({ type: 'success', message: `Sync "${activeProfileName}" completed successfully!` });
    } catch (err: any) {
      triggerAlert({ type: 'error', message: err.message });
    }
  };

  // Save current setup as reusable profile
  const handleSaveProfile = async () => {
    const activeProfileName = profileName.trim();
    if (!activeProfileName) {
      triggerAlert({ type: 'error', message: 'Please enter a name for the Sync Profile.' });
      return;
    }
    if (selectedSources.length === 0 || selectedDestinations.length === 0) {
      triggerAlert({ type: 'error', message: 'Select playlists before saving a profile.' });
      return;
    }

    try {
      const newProfile = {
        id: Math.random().toString(36).substring(2, 11),
        name: activeProfileName,
        sources: selectedSources,
        destinations: selectedDestinations,
        mode: syncMode,
        filters: {
          ...filters,
          maxDurationMs: filters.maxDurationMs * 1000
        },
        lastRun: null
      };

      await window.api.saveProfile(newProfile);
      triggerAlert({ type: 'success', message: `Saved profile "${activeProfileName}" successfully.` });
      setProfileName('');
    } catch (err: any) {
      triggerAlert({ type: 'error', message: 'Failed to save profile.' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Configuration Header */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Profile Name & Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <input 
              type="text" 
              placeholder="Give this Sync Workspace a name (e.g. Daily UMP Update)..." 
              className="glass-input"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <button 
              className="glass-button" 
              style={{ whiteSpace: 'nowrap' }}
              onClick={handleSaveProfile}
            >
              <Save size={16} />
              Save Profile
            </button>
          </div>

          {/* Sync Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mode:</span>
            <select 
              className="glass-select"
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as any)}
              style={{ padding: '8px 12px', fontSize: '12px' }}
            >
              <option value="update_only">Update Only (Add missing, never delete)</option>
              <option value="merge">Merge (Combine all, deduplicate)</option>
              <option value="mirror">Mirror (Make destination identical)</option>
              <option value="copy">Copy (Copy all, skip checking exist)</option>
            </select>
          </div>
        </div>

        {/* Filter Toggle and Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button 
            className="glass-button"
            onClick={() => setShowFilters(!showFilters)}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            <Settings2 size={14} />
            {showFilters ? 'Hide Smart Filters' : 'Configure Smart Filters'}
          </button>

          <button 
            className="glass-button primary"
            style={{ padding: '10px 24px', fontWeight: 700 }}
            onClick={handleSimulate}
            disabled={simulating}
          >
            <Eye size={16} />
            Run Dry Run Simulation
          </button>
        </div>

        {/* Filters Body */}
        {showFilters && (
          <div 
            className="animate-fade-in"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              padding: '16px',
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <label className="custom-checkbox" style={{ fontSize: '12px', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={filters.excludeExplicit} 
                onChange={(e) => setFilters(prev => ({ ...prev, excludeExplicit: e.target.checked }))} 
              />
              <span className="checkmark"></span>
              Exclude Explicit Tracks
            </label>

            <label className="custom-checkbox" style={{ fontSize: '12px', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={filters.excludeLocal} 
                onChange={(e) => setFilters(prev => ({ ...prev, excludeLocal: e.target.checked }))} 
              />
              <span className="checkmark"></span>
              Exclude Local Audio
            </label>

            <label className="custom-checkbox" style={{ fontSize: '12px', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={filters.excludePodcasts} 
                onChange={(e) => setFilters(prev => ({ ...prev, excludePodcasts: e.target.checked }))} 
              />
              <span className="checkmark"></span>
              Exclude Long Tracks (&gt;15m)
            </label>

            {/* Popularity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>MIN POPULARITY (0-100)</span>
              <input 
                type="number" 
                min="0" max="100" 
                className="glass-input" 
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={filters.minPopularity || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, minPopularity: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>

            {/* Duration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>MAX DURATION (SECONDS)</span>
              <input 
                type="number" 
                className="glass-input" 
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={filters.maxDurationMs || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, maxDurationMs: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>

            {/* Year range */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>YEAR START</span>
                <input 
                  type="text" 
                  maxLength={4} 
                  placeholder="e.g. 2010" 
                  className="glass-input" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  value={filters.releaseYearStart}
                  onChange={(e) => setFilters(prev => ({ ...prev, releaseYearStart: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>YEAR END</span>
                <input 
                  type="text" 
                  maxLength={4} 
                  placeholder="e.g. 2024" 
                  className="glass-input" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  value={filters.releaseYearEnd}
                  onChange={(e) => setFilters(prev => ({ ...prev, releaseYearEnd: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playlists Selection Workspace Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Left Column: Source Playlists */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '48vh' }}>
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Source Playlists ({selectedSources.length} selected)</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Songs will be exported FROM these playlists.</p>
          </div>

          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="Search source playlists..." 
              className="glass-input" 
              style={{ padding: '8px 12px 8px 30px', fontSize: '12px' }}
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
            />
            <Music size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button 
              className="glass-button" 
              style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px' }}
              onClick={() => selectAllSources(filteredSourcesList)}
            >
              Select All
            </button>
            <button 
              className="glass-button" 
              style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px' }}
              onClick={() => deselectAllSources(filteredSourcesList)}
            >
              Clear
            </button>
            <button 
              className="glass-button" 
              style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px', color: 'var(--warning)' }}
              onClick={selectFavoriteSources}
            >
              Select Favorites
            </button>
          </div>

          {/* Scroll List */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="scroller">
            {filteredSourcesList.map(playlist => {
              const isChecked = selectedSources.includes(playlist.id);
              return (
                <div 
                  key={playlist.id} 
                  onClick={() => handleToggleSource(playlist.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    backgroundColor: isChecked ? 'rgba(29, 185, 84, 0.06)' : 'transparent',
                    border: isChecked ? '1px solid rgba(29, 185, 84, 0.2)' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      readOnly
                      style={{ cursor: 'pointer' }}
                    />
                    
                    {/* Artwork mini */}
                    {playlist.image ? (
                      <img src={playlist.image} style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={14} color="var(--text-muted)" />
                      </div>
                    )}
                    
                    <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {playlist.name}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{playlist.trackCount} songs</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Destination Playlists */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '48vh' }}>
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Destination Playlists ({selectedDestinations.length} selected)</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Songs will be imported TO these playlists.</p>
          </div>

          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="Search destination playlists..." 
              className="glass-input" 
              style={{ padding: '8px 12px 8px 30px', fontSize: '12px' }}
              value={destSearch}
              onChange={(e) => setDestSearch(e.target.value)}
            />
            <Music size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button 
              className="glass-button" 
              style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px' }}
              onClick={() => selectAllDests(filteredDestsList)}
            >
              Select All
            </button>
            <button 
              className="glass-button" 
              style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px' }}
              onClick={() => deselectAllDests(filteredDestsList)}
            >
              Clear
            </button>
          </div>

          {/* Scroll List */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="scroller">
            {filteredDestsList.map(playlist => {
              const isChecked = selectedDestinations.includes(playlist.id);
              return (
                <div 
                  key={playlist.id} 
                  onClick={() => handleToggleDest(playlist.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    backgroundColor: isChecked ? 'rgba(29, 185, 84, 0.06)' : 'transparent',
                    border: isChecked ? '1px solid rgba(29, 185, 84, 0.2)' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      readOnly
                      style={{ cursor: 'pointer' }}
                    />
                    
                    {playlist.image ? (
                      <img src={playlist.image} style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={14} color="var(--text-muted)" />
                      </div>
                    )}
                    
                    <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {playlist.name}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{playlist.trackCount} songs</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dry Run Preview Dialog Modal */}
      {previewData && (
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
            style={{
              width: '680px',
              maxHeight: '85vh',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Modal Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Dry Run Simulation Report</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PREVIEW BEFORE DEPLOYING SYNC</span>
              </div>
              <button 
                className="glass-button" 
                style={{ padding: 6, borderRadius: '50%' }}
                onClick={() => setPreviewData(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Warnings Area */}
            {previewData.warnings.length > 0 && (
              <div 
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: 'var(--warning)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'start',
                  gap: 10
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '2px' }}>Execution Warnings:</h4>
                  <ul style={{ paddingLeft: '14px' }}>
                    {previewData.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TO ADD</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--spotify-green)', marginTop: '4px' }}>+{previewData.added.length}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TO DELETE</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>-{previewData.deletions.length}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>SKIPPED / EXITS</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>{previewData.existing.length + previewData.duplicates.length}</div>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>API CALLS</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '4px' }}>~{previewData.estimatedCalls}</div>
              </div>
            </div>

            {/* Scrollable list of actions */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)' }} className="scroller">
              <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)' }}>PREVIEW DETAILS</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12px' }}>
                {previewData.added.length === 0 && previewData.deletions.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Playlists are already in sync. No actions required.
                  </div>
                ) : (
                  <>
                    {/* Additions list */}
                    {previewData.added.map((t: any, i: number) => (
                      <div key={`add-${i}`} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                        <span>[+] {t.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{t.artists.join(', ')}</span>
                      </div>
                    ))}
                    {/* Deletions list */}
                    {previewData.deletions.map((id: string, i: number) => (
                      <div key={`del-${i}`} style={{ color: 'var(--danger)' }}>
                        [-] Track ID: {id} (Not in source playlists)
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Confirmation & Execution */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Checkbox confirmation */}
              {(previewData.added.length > 0 || previewData.deletions.length > 0) && (
                <label className="custom-checkbox" style={{ fontSize: '13px', fontWeight: 700 }}>
                  <input 
                    type="checkbox" 
                    checked={confirmExecute} 
                    onChange={(e) => setConfirmExecute(e.target.checked)} 
                  />
                  <span className="checkmark"></span>
                  I confirm that I want to execute this sync on my Spotify account.
                </label>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  className="glass-button" 
                  onClick={() => setPreviewData(null)}
                >
                  Cancel
                </button>
                <button 
                  className="glass-button primary" 
                  disabled={!confirmExecute && (previewData.added.length > 0 || previewData.deletions.length > 0)}
                  onClick={handleExecuteSync}
                  style={{ padding: '10px 24px' }}
                >
                  <Zap size={14} />
                  Execute Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
