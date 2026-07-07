import React, { useState, useEffect } from 'react';
import { Search, SortAsc, Star, Music, Clock, User, ArrowLeft, RefreshCcw } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  owner: string;
  image: string;
  trackCount: number;
  lastUpdated: number;
  isFavorite: boolean;
}

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
}

interface PlaylistBrowserProps {
  triggerAlert: (alert: { type: 'success' | 'error' | 'warning'; message: string }) => void;
}

type SortOption = 'alphabetical' | 'songs-desc' | 'updated-desc' | 'favorites-first';

export default function PlaylistBrowser({ triggerAlert }: PlaylistBrowserProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('favorites-first');
  const [filterOwnedOnly, setFilterOwnedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Selected playlist detail panel
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const loadPlaylists = async (forceSync = false) => {
    setLoading(true);
    try {
      if (forceSync) {
        setSyncing(true);
        triggerAlert({ type: 'warning', message: 'Syncing playlists with Spotify...' });
        await window.api.fetchPlaylists();
        triggerAlert({ type: 'success', message: 'Playlists refreshed successfully.' });
      }
      const data = await window.api.getPlaylists();
      setPlaylists(data);
    } catch (err: any) {
      console.error(err);
      triggerAlert({ type: 'error', message: 'Failed to load playlists.' });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const cached = await window.api.getPlaylists();
        const settings = await window.api.getSettings();
        const online = await window.api.getIsOnline();
        
        if (cached.length === 0 && online && settings.refreshToken) {
          await loadPlaylists(true);
        } else {
          setPlaylists(cached);
          setLoading(false);
        }
      } catch (err) {
        loadPlaylists();
      }
    };
    init();
  }, []);

  const handleToggleFavorite = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details select
    try {
      const updated = await window.api.toggleFavoritePlaylist(id);
      setPlaylists(updated);
      const isFav = updated.find(p => p.id === id)?.isFavorite;
      triggerAlert({ 
        type: 'success', 
        message: isFav ? `Added "${name}" to favorites.` : `Removed "${name}" from favorites.` 
      });
    } catch (err: any) {
      triggerAlert({ type: 'error', message: 'Failed to update favorite.' });
    }
  };

  const handleSelectPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    try {
      const cachedTracks = await window.api.getPlaylistTracks(playlist.id);
      setTracks(cachedTracks);
    } catch (err: any) {
      console.error(err);
      triggerAlert({ type: 'error', message: 'Failed to load songs from local cache.' });
    } finally {
      setLoadingTracks(false);
    }
  };

  // Filter and Sort implementation
  const processedPlaylists = playlists
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.owner.toLowerCase().includes(search.toLowerCase());
      
      if (filterOwnedOnly) {
        return matchesSearch && p.owner.toLowerCase() === 'me';
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'favorites-first') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.trackCount - a.trackCount; // fallback
      }
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'songs-desc') {
        return b.trackCount - a.trackCount;
      }
      if (sortBy === 'updated-desc') {
        return b.lastUpdated - a.lastUpdated;
      }
      return 0;
    });

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (selectedPlaylist) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Back Button and Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="glass-button" 
            onClick={() => { setSelectedPlaylist(null); setTracks([]); }}
            style={{ padding: '8px 12px' }}
          >
            <ArrowLeft size={16} />
            Back to list
          </button>
          
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{selectedPlaylist.name}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              By {selectedPlaylist.owner} • {selectedPlaylist.trackCount} songs
            </p>
          </div>
        </div>

        {/* Tracks List */}
        <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Cached Track List
          </h3>

          {loadingTracks ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCcw size={20} style={{ animation: 'spin 2s linear infinite', marginRight: '8px' }} />
              Loading songs...
            </div>
          ) : tracks.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No tracks cached for this playlist. Run a simulation/sync to download them.
            </div>
          ) : (
            <div style={{ maxHeight: '55vh', overflowY: 'auto' }} className="scroller">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>TITLE</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>ALBUM</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track, idx) => (
                    <tr 
                      key={track.id || idx} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{track.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{track.artists.join(', ')}</div>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{track.album}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatDuration(track.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Filters Controls */}
      <div 
        className="glass-panel" 
        style={{
          padding: '16px 20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
          <Search 
            size={16} 
            color="var(--text-muted)" 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input 
            type="text" 
            placeholder="Search playlists or owners..." 
            className="glass-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Sort and Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Sorting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SortAsc size={16} color="var(--text-secondary)" />
            <select 
              className="glass-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{ padding: '8px 12px', fontSize: '12px' }}
            >
              <option value="favorites-first">Favorites First</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="songs-desc">Songs Count</option>
              <option value="updated-desc">Recently Updated</option>
            </select>
          </div>

          {/* Owned Filter */}
          <label className="custom-checkbox" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={filterOwnedOnly} 
              onChange={(e) => setFilterOwnedOnly(e.target.checked)} 
            />
            <span className="checkmark"></span>
            Created by me
          </label>

          {/* Refresh Playlists Button */}
          <button 
            className="glass-button primary"
            style={{ padding: '8px 16px', fontSize: '12px' }}
            onClick={() => loadPlaylists(true)}
            disabled={syncing}
          >
            <RefreshCcw size={14} style={{ animation: syncing ? 'spin 2s linear infinite' : 'none' }} />
            Refresh List
          </button>
        </div>
      </div>

      {/* Grid of Playlists */}
      {loading ? (
        <div style={{ display: 'flex', padding: '60px', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCcw size={24} style={{ animation: 'spin 2s linear infinite', marginRight: '10px' }} />
          Loading playlists...
        </div>
      ) : processedPlaylists.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No playlists found matching your search. Click "Refresh List" to download your latest playlists from Spotify.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {processedPlaylists.map((playlist) => (
            <div 
              key={playlist.id} 
              className="glass-panel" 
              onClick={() => handleSelectPlaylist(playlist)}
              style={{
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              {/* Cover Artwork */}
              <div 
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(255,255,255,0.02)'
                }}
              >
                {playlist.image ? (
                  <img 
                    src={playlist.image} 
                    alt={playlist.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <Music size={40} />
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>NO ARTWORK</span>
                  </div>
                )}
                
                {/* Favorite Star Overlay */}
                <button 
                  onClick={(e) => handleToggleFavorite(playlist.id, playlist.name, e)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.65)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: playlist.isFavorite ? 'var(--warning)' : 'var(--text-muted)',
                    transition: 'scale 0.2s ease',
                    backdropFilter: 'blur(4px)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.scale = '1.1'}
                  onMouseLeave={(e) => e.currentTarget.style.scale = '1'}
                >
                  <Star size={16} fill={playlist.isFavorite ? 'var(--warning)' : 'none'} />
                </button>
              </div>

              {/* Text Info */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                  {playlist.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <User size={12} />
                  <span>By {playlist.owner}</span>
                </div>
              </div>

              {/* Bottom stats row */}
              <div 
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  borderTop: '1px solid rgba(255,255,255,0.03)',
                  paddingTop: '10px',
                  marginTop: 'auto'
                }}
              >
                <span>{playlist.trackCount} songs</span>
                {playlist.lastUpdated > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} />
                    {new Date(playlist.lastUpdated).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                ) : (
                  <span>Never Synced</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
