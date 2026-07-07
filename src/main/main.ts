import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { DBStore, PlaylistCache } from './db';
import { SpotifyClient } from './spotify';
import { SyncEngine } from './sync';
import { SyncScheduler } from './scheduler';

let mainWindow: BrowserWindow | null = null;
let isOnline = true;
let dnsCheckInterval: NodeJS.Timeout | null = null;

// Initialize core services
const db = new DBStore();
const spotify = new SpotifyClient(db);
const syncEngine = new SyncEngine(spotify, db);
const scheduler = new SyncScheduler(db, syncEngine);

function checkConnection() {
  dns.lookup('google.com', (err) => {
    const currentStatus = !err;
    if (currentStatus !== isOnline) {
      isOnline = currentStatus;
      scheduler.setOnlineStatus(isOnline);
      mainWindow?.webContents.send('connectivity-changed', isOnline);
      console.log(`Connection state changed. Online: ${isOnline}`);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 950,
    minHeight: 650,
    titleBarStyle: 'hiddenInset', // beautiful native title bar for macOS
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check initial connection
  checkConnection();
  dnsCheckInterval = setInterval(checkConnection, 10000); // Check every 10 seconds
}

// IPC Handlers wiring
function registerIpcHandlers() {
  // Connection and App Status
  ipcMain.handle('app:getIsOnline', () => isOnline);
  ipcMain.handle('app:setOnlineStatus', (_event, online: boolean) => {
    isOnline = online;
    scheduler.setOnlineStatus(online);
    mainWindow?.webContents.send('connectivity-changed', isOnline);
    return isOnline;
  });

  // DB Getters & Setters
  ipcMain.handle('db:getSettings', () => db.getSettings());
  ipcMain.handle('db:updateSettings', (_event, updates) => {
    db.updateSettings(updates);
    return db.getSettings();
  });

  ipcMain.handle('db:getPlaylists', () => db.getPlaylists());
  
  ipcMain.handle('db:getPlaylistTracks', (_event, id) => {
    return db.getPlaylistTracks(id);
  });

  ipcMain.handle('db:clearAllCache', () => {
    db.clearAllCache();
    return true;
  });

  ipcMain.handle('db:toggleFavoritePlaylist', (_event, id) => {
    const p = db.getPlaylist(id);
    if (p) {
      p.isFavorite = !p.isFavorite;
      db.savePlaylist(p);
    }
    return db.getPlaylists();
  });

  ipcMain.handle('db:getProfiles', () => db.getProfiles());
  ipcMain.handle('db:getProfile', (_event, id) => db.getProfile(id));
  
  ipcMain.handle('db:saveProfile', (_event, profile) => {
    db.saveProfile(profile);
    return db.getProfiles();
  });

  ipcMain.handle('db:deleteProfile', (_event, id) => {
    db.deleteProfile(id);
    return db.getProfiles();
  });

  ipcMain.handle('db:getSchedules', () => db.getSchedules());
  ipcMain.handle('db:saveSchedule', (_event, schedule) => {
    // If saving a schedule, recalculate nextRun
    if (!schedule.nextRun && schedule.interval !== 'manual') {
      schedule.nextRun = scheduler.calculateNextRun(schedule.interval);
    }
    db.saveSchedule(schedule);
    return db.getSchedules();
  });

  ipcMain.handle('db:deleteSchedule', (_event, id) => {
    db.deleteSchedule(id);
    return db.getSchedules();
  });

  ipcMain.handle('db:getLogs', () => db.getLogs());
  ipcMain.handle('db:clearLogs', () => {
    db.clearLogs();
    return db.getLogs();
  });

  ipcMain.handle('db:getQueue', () => db.getQueue());
  ipcMain.handle('db:removeFromQueue', (_event, id) => {
    db.removeFromQueue(id);
    return db.getQueue();
  });

  // Spotify Operations
  ipcMain.handle('spotify:login', async () => {
    return await spotify.startAuthFlow();
  });

  ipcMain.handle('spotify:refreshTokens', async () => {
    await spotify.refreshTokens();
    return true;
  });

  ipcMain.handle('spotify:getUserInfo', async () => {
    return await spotify.getUserInfo();
  });

  ipcMain.handle('spotify:fetchPlaylists', async () => {
    if (!isOnline) {
      return db.getPlaylists();
    }

    try {
      const rawPlaylists = await spotify.fetchUserPlaylists();
      
      // Map to local cache structure
      const mappedPlaylists: PlaylistCache[] = rawPlaylists.map(p => {
        const cached = db.getPlaylist(p.id);
        // Spotify API may return track count under 'tracks' or 'items'
        const trackTotal = p.tracks?.total ?? p.items?.total ?? 0;
        // Images may be null or empty array
        const imageUrl = (p.images && Array.isArray(p.images) && p.images.length > 0) ? p.images[0].url : '';
        return {
          id: p.id,
          name: p.name,
          owner: p.owner?.display_name || p.owner?.id || 'Unknown',
          image: imageUrl,
          trackCount: trackTotal,
          lastUpdated: cached?.lastUpdated || 0,
          isFavorite: cached?.isFavorite || false
        };
      });

      // Also include special Liked Songs playlist for convenience
      const likedCached = db.getPlaylist('liked-songs');
      mappedPlaylists.unshift({
        id: 'liked-songs',
        name: 'Liked Songs',
        owner: 'Me',
        image: '', // CSS will render heart icon if empty image
        trackCount: likedCached?.trackCount || 0,
        lastUpdated: likedCached?.lastUpdated || 0,
        isFavorite: likedCached?.isFavorite || false
      });

      db.savePlaylistsBatch(mappedPlaylists);
      return db.getPlaylists();
    } catch (err: any) {
      console.error('Failed to sync playlists with Spotify:', err);
      // If cache has data, return it as fallback. Otherwise rethrow so the UI shows the error.
      const cached = db.getPlaylists();
      if (cached.length > 0) {
        return cached;
      }
      throw new Error(err?.message || 'Failed to fetch playlists from Spotify.');
    }
  });

  // Sync Engine Operations
  ipcMain.handle('sync:preview', async (_event, profile) => {
    return await syncEngine.previewSync(profile, !isOnline);
  });

  ipcMain.handle('sync:execute', async (_event, profileId) => {
    const log = await syncEngine.executeSync(profileId, !isOnline, (progress) => {
      mainWindow?.webContents.send('sync-progress', progress);
    });
    return log;
  });
}

// App Lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // Listen to background scheduler triggers
  scheduler.onSyncComplete(() => {
    mainWindow?.webContents.send('data-updated');
  });
  
  // Start the scheduler
  scheduler.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  scheduler.stop();
  if (dnsCheckInterval) {
    clearInterval(dnsCheckInterval);
  }
});
