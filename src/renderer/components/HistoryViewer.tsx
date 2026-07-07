import React, { useState, useEffect } from 'react';
import { History, Download, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SyncLog {
  id: string;
  timestamp: string;
  durationMs: number;
  status: 'success' | 'failed' | 'warning';
  profileName: string;
  mode: string;
  sources: string[];
  destinations: string[];
  addedCount: number;
  skippedCount: number;
  deletedCount: number;
  details: string[];
}

interface HistoryViewerProps {
  triggerAlert: (alert: { type: 'success' | 'error' | 'warning'; message: string }) => void;
}

export default function HistoryViewer({ triggerAlert }: HistoryViewerProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      const data = await window.api.getLogs();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      triggerAlert({ type: 'error', message: 'Failed to retrieve sync history.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleToggleExpand = (id: string) => {
    setExpandedLog(prev => (prev === id ? null : id));
  };

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to permanently clear the synchronization history? This action cannot be undone.')) {
      try {
        const cleared = await window.api.clearLogs();
        setLogs(cleared);
        triggerAlert({ type: 'success', message: 'Sync history cleared successfully.' });
      } catch (err: any) {
        triggerAlert({ type: 'error', message: 'Failed to clear sync history.' });
      }
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ump_sync_history_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerAlert({ type: 'success', message: 'JSON history exported.' });
    } catch (err) {
      triggerAlert({ type: 'error', message: 'Failed to export history.' });
    }
  };

  const handleExportCSV = () => {
    try {
      // Build simple CSV structure
      const headers = ['ID', 'Timestamp', 'Profile Name', 'Mode', 'Status', 'Duration (s)', 'Added', 'Skipped/Duplicates', 'Deleted', 'Sources', 'Destinations'];
      const rows = logs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        `"${log.profileName.replace(/"/g, '""')}"`,
        log.mode,
        log.status,
        (log.durationMs / 1000).toFixed(2),
        log.addedCount,
        log.skippedCount,
        log.deletedCount,
        `"${log.sources.join(', ').replace(/"/g, '""')}"`,
        `"${log.destinations.join(', ').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ump_sync_history_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerAlert({ type: 'success', message: 'CSV history exported.' });
    } catch (err) {
      triggerAlert({ type: 'error', message: 'Failed to export history.' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading execution history...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header and Control Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Execution Logs</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Check synchronization runtimes, successes, errors, and detail reports.
          </p>
        </div>

        {logs.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="glass-button" 
              style={{ fontSize: '12px', padding: '8px 12px' }}
              onClick={handleExportJSON}
            >
              <Download size={14} />
              Export JSON
            </button>
            <button 
              className="glass-button" 
              style={{ fontSize: '12px', padding: '8px 12px' }}
              onClick={handleExportCSV}
            >
              <Download size={14} />
              Export CSV
            </button>
            <button 
              className="glass-button" 
              style={{ fontSize: '12px', padding: '8px 12px', color: 'var(--danger)' }}
              onClick={handleClearLogs}
            >
              <Trash2 size={14} />
              Clear History
            </button>
          </div>
        )}
      </div>

      {/* History List */}
      {logs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <History size={48} style={{ strokeWidth: 1.5, marginBottom: '16px', color: 'rgba(255,255,255,0.05)' }} />
          <p style={{ fontSize: '14px' }}>No execution logs recorded yet.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Create and run a Sync Profile to log your first transaction.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '20px', overflow: 'hidden' }}>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="scroller">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>PROFILE</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>MODE</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>ADDS</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>DELS</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>DURATION</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>TIMESTAMP</th>
                  <th style={{ padding: '12px 8px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedLog === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => handleToggleExpand(log.id)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'rgba(255,255,255,0.01)' : 'transparent'
                        }}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.015)'; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '14px 8px' }}>
                          <span 
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: log.status === 'success' ? 'var(--success)' : log.status === 'warning' ? 'var(--warning)' : 'var(--danger)'
                            }}
                          >
                            {log.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', fontWeight: 600 }}>{log.profileName}</td>
                        <td style={{ padding: '14px 8px', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {log.mode.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                          +{log.addedCount}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 700, color: log.deletedCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          -{log.deletedCount}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {(log.durationMs / 1000).toFixed(1)}s
                        </td>
                        <td style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '14px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: '16px 24px', backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              
                              {/* Path */}
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-muted)' }}>PATH:</strong> {log.sources.join(', ')} ➔ {log.destinations.join(', ')}
                              </div>
                              
                              {/* Details text logs */}
                              <div>
                                <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>LOG ENTRIES:</strong>
                                <div 
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    lineHeight: '1.5'
                                  }}
                                  className="scroller"
                                >
                                  {log.details.map((detail, dIdx) => (
                                    <div key={dIdx} style={{ color: detail.startsWith('Error') || detail.startsWith('Failed') ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                      {detail}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
