import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Connection and Event Listeners
  onConnectivityChanged: (callback: (isOnline: boolean) => void) => {
    const subscription = (_event: any, isOnline: boolean) => callback(isOnline);
    ipcRenderer.on('connectivity-changed', subscription);
    return () => {
      ipcRenderer.removeListener('connectivity-changed', subscription);
    };
  },
  onSyncProgress: (callback: (status: { step: string; percent: number }) => void) => {
    const subscription = (_event: any, status: { step: string; percent: number }) => callback(status);
    ipcRenderer.on('sync-progress', subscription);
    return () => {
      ipcRenderer.removeListener('sync-progress', subscription);
    };
  },
  onDataUpdated: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('data-updated', subscription);
    return () => {
      ipcRenderer.removeListener('data-updated', subscription);
    };
  },

  // DB Store API
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSettings: (updates: any) => ipcRenderer.invoke('db:updateSettings', updates),
  getPlaylists: () => ipcRenderer.invoke('db:getPlaylists'),
  getPlaylistTracks: (id: string) => ipcRenderer.invoke('db:getPlaylistTracks', id),
  clearAllCache: () => ipcRenderer.invoke('db:clearAllCache'),
  toggleFavoritePlaylist: (id: string) => ipcRenderer.invoke('db:toggleFavoritePlaylist', id),
  
  getProfiles: () => ipcRenderer.invoke('db:getProfiles'),
  getProfile: (id: string) => ipcRenderer.invoke('db:getProfile', id),
  saveProfile: (profile: any) => ipcRenderer.invoke('db:saveProfile', profile),
  deleteProfile: (id: string) => ipcRenderer.invoke('db:deleteProfile', id),
  
  getSchedules: () => ipcRenderer.invoke('db:getSchedules'),
  saveSchedule: (schedule: any) => ipcRenderer.invoke('db:saveSchedule', schedule),
  deleteSchedule: (id: string) => ipcRenderer.invoke('db:deleteSchedule', id),
  
  getLogs: () => ipcRenderer.invoke('db:getLogs'),
  clearLogs: () => ipcRenderer.invoke('db:clearLogs'),
  getQueue: () => ipcRenderer.invoke('db:getQueue'),
  removeFromQueue: (id: string) => ipcRenderer.invoke('db:removeFromQueue', id),

  // Spotify and Sync Engine
  login: () => ipcRenderer.invoke('spotify:login'),
  refreshTokens: () => ipcRenderer.invoke('spotify:refreshTokens'),
  getUserInfo: () => ipcRenderer.invoke('spotify:getUserInfo'),
  fetchPlaylists: () => ipcRenderer.invoke('spotify:fetchPlaylists'),
  previewSync: (profile: any) => ipcRenderer.invoke('sync:preview', profile),
  executeSync: (profileId: string) => ipcRenderer.invoke('sync:execute', profileId),
  
  // Utilities
  getIsOnline: () => ipcRenderer.invoke('app:getIsOnline'),
  setOnlineStatus: (online: boolean) => ipcRenderer.invoke('app:setOnlineStatus', online)
});
