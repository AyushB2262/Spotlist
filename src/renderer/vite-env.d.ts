/// <reference types="vite/client" />

interface Window {
  api: {
    onConnectivityChanged: (callback: (isOnline: boolean) => void) => () => void;
    onSyncProgress: (callback: (status: { step: string; percent: number }) => void) => () => void;
    onDataUpdated: (callback: () => void) => () => void;
    getSettings: () => Promise<{
      clientId: string;
      clientSecret: string;
      accessToken: string;
      refreshToken: string;
      tokenExpiry: number;
      theme: 'light' | 'dark' | 'system';
    }>;
    updateSettings: (updates: any) => Promise<any>;
    getPlaylists: () => Promise<any[]>;
    getPlaylistTracks: (id: string) => Promise<any[]>;
    clearAllCache: () => Promise<boolean>;
    toggleFavoritePlaylist: (id: string) => Promise<any[]>;
    getProfiles: () => Promise<any[]>;
    getProfile: (id: string) => Promise<any>;
    saveProfile: (profile: any) => Promise<any[]>;
    deleteProfile: (id: string) => Promise<any[]>;
    getSchedules: () => Promise<any[]>;
    saveSchedule: (schedule: any) => Promise<any[]>;
    deleteSchedule: (id: string) => Promise<any[]>;
    getLogs: () => Promise<any[]>;
    clearLogs: () => Promise<any[]>;
    getQueue: () => Promise<any[]>;
    removeFromQueue: (id: string) => Promise<any[]>;
    login: () => Promise<{ success: boolean; username?: string }>;
    refreshTokens: () => Promise<boolean>;
    getUserInfo: () => Promise<any>;
    fetchPlaylists: () => Promise<any[]>;
    previewSync: (profile: any) => Promise<any>;
    executeSync: (profileId: string) => Promise<any>;
    getIsOnline: () => Promise<boolean>;
    setOnlineStatus: (online: boolean) => Promise<boolean>;
  };
}
