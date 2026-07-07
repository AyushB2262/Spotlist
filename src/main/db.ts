import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface PlaylistCache {
  id: string;
  name: string;
  owner: string;
  image: string;
  trackCount: number;
  lastUpdated: number;
  isFavorite: boolean;
}

export interface TrackCache {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  isExplicit: boolean;
  isLocal: boolean;
  popularity: number;
  releaseYear: number;
}

export interface SyncProfile {
  id: string;
  name: string;
  sources: string[];
  destinations: string[];
  mode: 'copy' | 'mirror' | 'merge' | 'update_only';
  filters: {
    likedOnly: boolean;
    excludeExplicit: boolean;
    excludePodcasts: boolean;
    excludeLocal: boolean;
    minPopularity: number;
    maxDurationMs: number;
    releaseYearStart: string;
    releaseYearEnd: string;
  };
  lastRun: string | null;
}

export interface SyncSchedule {
  id: string;
  profileId: string;
  interval: 'hourly' | 'daily' | 'weekly' | 'startup' | 'manual';
  lastRun: string | null;
  nextRun: string | null;
}

export interface SyncLog {
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

export interface PendingSyncJob {
  id: string;
  profileId: string;
  timestamp: string;
}

export interface DBData {
  settings: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
    theme: 'light' | 'dark' | 'system';
  };
  playlists: Record<string, PlaylistCache>;
  tracks: Record<string, TrackCache[]>;
  profiles: SyncProfile[];
  schedules: SyncSchedule[];
  logs: SyncLog[];
  queue: PendingSyncJob[];
}

const DEFAULT_DATA: DBData = {
  settings: {
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiry: 0,
    theme: 'system'
  },
  playlists: {},
  tracks: {},
  profiles: [],
  schedules: [],
  logs: [],
  queue: []
};

export class DBStore {
  private filePath: string;
  private data: DBData;

  constructor() {
    // If running in development, write to the workspace folder
    const isDev = !app.isPackaged;
    const baseDir = isDev 
      ? path.join(__dirname, '../../data') 
      : path.join(app.getPath('userData'), 'data');
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.filePath = path.join(baseDir, 'db.json');
    this.data = this.load();
  }

  private load(): DBData {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Deep merge with default structure to verify all properties are present
        return {
          ...DEFAULT_DATA,
          ...parsed,
          settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
          playlists: parsed.playlists || {},
          tracks: parsed.tracks || {},
          profiles: parsed.profiles || [],
          schedules: parsed.schedules || [],
          logs: parsed.logs || [],
          queue: parsed.queue || []
        };
      }
    } catch (error) {
      console.error('Failed to load database file, resetting to default:', error);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  private save(): void {
    try {
      const tempPath = this.filePath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (error) {
      console.error('Failed to write database file:', error);
    }
  }

  // Settings
  public getSettings() {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<DBData['settings']>): void {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
  }

  // Playlists Cache
  public getPlaylists(): PlaylistCache[] {
    return Object.values(this.data.playlists);
  }

  public getPlaylist(id: string): PlaylistCache | undefined {
    return this.data.playlists[id];
  }

  public savePlaylist(playlist: PlaylistCache): void {
    this.data.playlists[playlist.id] = playlist;
    this.save();
  }

  public savePlaylistsBatch(playlists: PlaylistCache[]): void {
    playlists.forEach(p => {
      this.data.playlists[p.id] = p;
    });
    this.save();
  }

  public deletePlaylistCache(id: string): void {
    delete this.data.playlists[id];
    delete this.data.tracks[id];
    this.save();
  }

  public clearAllCache(): void {
    this.data.playlists = {};
    this.data.tracks = {};
    this.save();
  }

  // Tracks Cache
  public getPlaylistTracks(playlistId: string): TrackCache[] {
    return this.data.tracks[playlistId] || [];
  }

  public savePlaylistTracks(playlistId: string, tracks: TrackCache[]): void {
    this.data.tracks[playlistId] = tracks;
    // Update lastUpdated timestamp on the cached playlist
    if (this.data.playlists[playlistId]) {
      this.data.playlists[playlistId].lastUpdated = Date.now();
    }
    this.save();
  }

  // Profiles
  public getProfiles(): SyncProfile[] {
    return this.data.profiles;
  }

  public getProfile(id: string): SyncProfile | undefined {
    return this.data.profiles.find(p => p.id === id);
  }

  public saveProfile(profile: SyncProfile): void {
    const idx = this.data.profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      this.data.profiles[idx] = profile;
    } else {
      this.data.profiles.push(profile);
    }
    this.save();
  }

  public deleteProfile(id: string): void {
    this.data.profiles = this.data.profiles.filter(p => p.id !== id);
    this.data.schedules = this.data.schedules.filter(s => s.profileId !== id);
    this.data.queue = this.data.queue.filter(q => q.profileId !== id);
    this.save();
  }

  // Schedules
  public getSchedules(): SyncSchedule[] {
    return this.data.schedules;
  }

  public saveSchedule(schedule: SyncSchedule): void {
    const idx = this.data.schedules.findIndex(s => s.id === schedule.id);
    if (idx !== -1) {
      this.data.schedules[idx] = schedule;
    } else {
      this.data.schedules.push(schedule);
    }
    this.save();
  }

  public deleteSchedule(id: string): void {
    this.data.schedules = this.data.schedules.filter(s => s.id !== id);
    this.save();
  }

  // Logs
  public getLogs(): SyncLog[] {
    // Return sorted from newest to oldest
    return [...this.data.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addLog(log: Omit<SyncLog, 'id'>): SyncLog {
    const newLog: SyncLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 11)
    };
    this.data.logs.push(newLog);
    // Keep max 500 logs to prevent memory/file bloat
    if (this.data.logs.length > 500) {
      this.data.logs.shift();
    }
    this.save();
    return newLog;
  }

  public clearLogs(): void {
    this.data.logs = [];
    this.save();
  }

  // Offline Queue
  public getQueue(): PendingSyncJob[] {
    return this.data.queue;
  }

  public addToQueue(profileId: string): PendingSyncJob {
    const newJob: PendingSyncJob = {
      id: Math.random().toString(36).substring(2, 11),
      profileId,
      timestamp: new Date().toISOString()
    };
    this.data.queue.push(newJob);
    this.save();
    return newJob;
  }

  public removeFromQueue(id: string): void {
    this.data.queue = this.data.queue.filter(q => q.id !== id);
    this.save();
  }

  public getFilePath(): string {
    return this.filePath;
  }
}
