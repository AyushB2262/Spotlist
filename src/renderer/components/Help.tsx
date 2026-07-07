import React from 'react';
import { HelpCircle, RefreshCw, Layers, Calendar, Zap, AlertTriangle, Key } from 'lucide-react';

export default function HelpView() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      
      {/* Introduction */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HelpCircle size={18} color="var(--spotify-green)" />
          Spot Playmaker User Manual
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Welcome to the Spotify Playlist Manager & Sync Agent. This desktop app is designed to automate the management of your master playlist, <strong>Ultimate Mixtape (UMP)</strong>, by synchronizing tracks from various sub-playlists (genres, moods, artists) in one click or on custom timed schedules.
        </p>
      </div>

      {/* Sync Modes Guide */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} color="var(--accent-indigo)" />
          Understanding Sync Modes
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--spotify-green)', marginBottom: '4px' }}>Update Only (Recommended)</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Scans destinations, finds songs in source playlists that do not already exist in destinations, and imports only those additions. <strong>Never deletes songs from your destination playlists.</strong>
            </p>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '4px' }}>Mirror Mode</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Forces destination playlists to be <strong>exactly identical</strong> to your source playlists. Any song in the destination playlist that is NOT found in your source playlists will be deleted. Always check the warning report in the preview before executing.
            </p>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Merge Mode</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Combines tracks from all selected source playlists, filters out duplicate tracks in memory, and writes the clean, unique set to destinations. No tracks are deleted.
            </p>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warning)', marginBottom: '4px' }}>Copy Mode</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Performs a raw copy. Appends all tracks from sources into your destinations. Does not check for existing tracks or duplicates, mimicking Spotify's native copy-paste behavior.
            </p>
          </div>
        </div>
      </div>

      {/* Offline capabilities */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} color="var(--warning)" />
          Offline Cache & Sync Queue
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '8px' }}>
          If your internet goes down, Spot Playmaker remains fully functional:
        </p>
        <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>You can browse cached playlists, read tracklists, and configure smart filters.</li>
          <li>If you trigger a sync offline, the app places it in the <strong>Pending Offline Queue</strong>.</li>
          <li>Once connectivity is restored, the background queue worker automatically picks up and executes the pending jobs in sequence.</li>
        </ul>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Keyboard Shortcuts</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Open Settings</span>
            <kbd style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>Cmd/Ctrl + ,</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Quick Refresh Playlists</span>
            <kbd style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>Cmd/Ctrl + R</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Start Dry Run Preview</span>
            <kbd style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>Cmd/Ctrl + Enter</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
