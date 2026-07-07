import { SpotifyClient } from './spotify';
import { DBStore, TrackCache, SyncLog, SyncProfile } from './db';

export interface SyncPreviewResult {
  added: Omit<TrackCache, 'isLocal' | 'popularity' | 'releaseYear'>[];
  existing: string[];
  duplicates: string[];
  skipped: string[];
  deletions: string[];
  estimatedCalls: number;
  estimatedTimeSec: number;
  warnings: string[];
}

export class SyncEngine {
  private spotify: SpotifyClient;
  private db: DBStore;

  constructor(spotify: SpotifyClient, db: DBStore) {
    this.spotify = spotify;
    this.db = db;
  }

  // Normalize song/artist/album strings to check matches
  public static normalizeString(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')   // Remove parentheses content: (remaster), (feat...)
      .replace(/\[[^\]]*\]/g, '')   // Remove bracket content: [remix]
      .replace(/\sfeat\..*$/g, '')  // Remove feat. suffix
      .replace(/[^a-z0-9]/g, '')    // Strip non-alphanumeric chars
      .trim();
  }

  // Match if track is a duplicate based on spec rules
  public static areTracksEqual(a: TrackCache, b: TrackCache): boolean {
    // 1. Spotify ID Match
    if (a.id && b.id && a.id === b.id) {
      return true;
    }

    // Fallback: Check Title + Artist + Duration tolerance (2000ms)
    const normTitleA = SyncEngine.normalizeString(a.name);
    const normTitleB = SyncEngine.normalizeString(b.name);

    if (normTitleA === normTitleB && normTitleA !== '') {
      // Compare artists (sort to avoid order differences)
      const artistsA = [...a.artists].map(SyncEngine.normalizeString).sort().join('');
      const artistsB = [...b.artists].map(SyncEngine.normalizeString).sort().join('');

      if (artistsA === artistsB && artistsA !== '') {
        // Duration tolerance of 2 seconds
        const timeDiff = Math.abs(a.durationMs - b.durationMs);
        if (timeDiff <= 2000) {
          return true;
        }
      }
    }
    return false;
  }

  // Convert Spotify API track object to local TrackCache type
  private mapSpotifyTrack(item: any): TrackCache {
    const track = item.track;
    let releaseYear = 0;
    if (track.album && track.album.release_date) {
      releaseYear = parseInt(track.album.release_date.split('-')[0], 10) || 0;
    }

    return {
      id: track.id || '',
      name: track.name || 'Unknown Track',
      artists: track.artists ? track.artists.map((a: any) => a.name) : ['Unknown Artist'],
      album: track.album ? track.album.name : 'Unknown Album',
      durationMs: track.duration_ms || 0,
      isExplicit: track.explicit || false,
      isLocal: track.is_local || false,
      popularity: track.popularity || 0,
      releaseYear
    };
  }

  // Apply filters on source tracks
  private filterTracks(tracks: TrackCache[], filters: SyncProfile['filters']): { passed: TrackCache[], skippedNames: string[] } {
    const passed: TrackCache[] = [];
    const skippedNames: string[] = [];

    tracks.forEach(track => {
      // Exclude Explicit
      if (filters.excludeExplicit && track.isExplicit) {
        skippedNames.push(`${track.name} (Explicit)`);
        return;
      }
      // Exclude Local
      if (filters.excludeLocal && track.isLocal) {
        skippedNames.push(`${track.name} (Local file)`);
        return;
      }
      // Exclude Podcasts / Episodes (normally no ID or duration > 15 mins and not standard music)
      if (filters.excludePodcasts && (!track.id || track.durationMs > 900000)) {
        skippedNames.push(`${track.name} (Podcast/Long track)`);
        return;
      }
      // Popularity
      if (filters.minPopularity > 0 && track.popularity < filters.minPopularity) {
        skippedNames.push(`${track.name} (Popularity ${track.popularity} < ${filters.minPopularity})`);
        return;
      }
      // Duration
      if (filters.maxDurationMs > 0 && track.durationMs > filters.maxDurationMs) {
        skippedNames.push(`${track.name} (Duration exceeds limit)`);
        return;
      }
      // Release Year Start
      if (filters.releaseYearStart) {
        const start = parseInt(filters.releaseYearStart, 10);
        if (!isNaN(start) && track.releaseYear < start) {
          skippedNames.push(`${track.name} (Released ${track.releaseYear} < ${start})`);
          return;
        }
      }
      // Release Year End
      if (filters.releaseYearEnd) {
        const end = parseInt(filters.releaseYearEnd, 10);
        if (!isNaN(end) && track.releaseYear > end) {
          skippedNames.push(`${track.name} (Released ${track.releaseYear} > ${end})`);
          return;
        }
      }

      passed.push(track);
    });

    return { passed, skippedNames };
  }

  // Run a dry run calculation (simulation)
  public async previewSync(
    profile: SyncProfile,
    isOffline: boolean
  ): Promise<SyncPreviewResult> {
    const warnings: string[] = [];

    // Get source tracks
    let sourceTracks: TrackCache[] = [];
    
    if (isOffline) {
      // Load from local database cache
      profile.sources.forEach(srcId => {
        const cached = this.db.getPlaylistTracks(srcId);
        sourceTracks = sourceTracks.concat(cached);
      });
      warnings.push('Working offline: previews are calculated using the cached local database snapshots.');
    } else {
      // Fetch online from Spotify
      try {
        for (const srcId of profile.sources) {
          const rawTracks = await this.spotify.fetchPlaylistTracks(srcId);
          const mapped = rawTracks.map(item => this.mapSpotifyTrack(item));
          
          // Refresh local database cache while we have the fresh tracks
          this.db.savePlaylistTracks(srcId, mapped);
          sourceTracks = sourceTracks.concat(mapped);
        }
      } catch (err: any) {
        throw new Error(`Failed to fetch source playlists: ${err.message}`);
      }
    }

    // Apply smart filters
    const filterResult = this.filterTracks(sourceTracks, profile.filters);
    const filteredSources = filterResult.passed;

    // Deduplicate sources in memory (so we don't sync duplicates inside the sources themselves)
    const uniqueSourceTracks: TrackCache[] = [];
    const sourceDuplicates: string[] = [];

    filteredSources.forEach(track => {
      const exists = uniqueSourceTracks.some(t => SyncEngine.areTracksEqual(t, track));
      if (exists) {
        sourceDuplicates.push(`${track.name} - ${track.artists.join(', ')}`);
      } else {
        uniqueSourceTracks.push(track);
      }
    });

    // Get target destination tracks
    let targetTracks: TrackCache[] = [];
    
    if (isOffline) {
      profile.destinations.forEach(destId => {
        const cached = this.db.getPlaylistTracks(destId);
        targetTracks = targetTracks.concat(cached);
      });
    } else {
      try {
        for (const destId of profile.destinations) {
          const rawTracks = await this.spotify.fetchPlaylistTracks(destId);
          const mapped = rawTracks.map(item => this.mapSpotifyTrack(item));
          
          // Refresh cache
          this.db.savePlaylistTracks(destId, mapped);
          targetTracks = targetTracks.concat(mapped);
        }
      } catch (err: any) {
        throw new Error(`Failed to fetch destination playlists: ${err.message}`);
      }
    }

    // Compute logic depending on the mode
    const toAdd: TrackCache[] = [];
    const existing: string[] = [];
    const duplicates: string[] = [...sourceDuplicates];
    const deletions: string[] = [];

    if (profile.mode === 'copy') {
      // Copy simply adds all source tracks to destination regardless of whether they exist.
      // (This matches standard copy behavior in Spotify which doesn't check duplicates).
      toAdd.push(...uniqueSourceTracks);
    } else if (profile.mode === 'merge' || profile.mode === 'update_only') {
      // Update Only / Merge: check if track already exists in target
      uniqueSourceTracks.forEach(track => {
        const existsInTarget = targetTracks.some(targetTrack => SyncEngine.areTracksEqual(targetTrack, track));
        if (existsInTarget) {
          existing.push(`${track.name} - ${track.artists.join(', ')}`);
        } else {
          toAdd.push(track);
        }
      });
    } else if (profile.mode === 'mirror') {
      // Mirror: Destination becomes exactly equal to Source.
      // Add missing tracks:
      uniqueSourceTracks.forEach(track => {
        const existsInTarget = targetTracks.some(targetTrack => SyncEngine.areTracksEqual(targetTrack, track));
        if (existsInTarget) {
          existing.push(`${track.name} - ${track.artists.join(', ')}`);
        } else {
          toAdd.push(track);
        }
      });
      // Delete extra tracks (tracks in destination that are not in the unique source list):
      targetTracks.forEach(targetTrack => {
        const existsInSource = uniqueSourceTracks.some(sourceTrack => SyncEngine.areTracksEqual(sourceTrack, targetTrack));
        if (!existsInSource && targetTrack.id) {
          deletions.push(targetTrack.id);
        }
      });
    }

    // Estimate API operations & duration
    // Fetching: already done. Write operations require batches of 100.
    const addBatches = Math.ceil(toAdd.length / 100);
    const deleteBatches = Math.ceil(deletions.length / 100);
    const estimatedCalls = addBatches + deleteBatches;
    
    // Each batch operation takes around 300ms including network latency
    const estimatedTimeSec = Math.max(1, Math.round(estimatedCalls * 0.4));

    if (profile.mode === 'mirror' && deletions.length > 0) {
      warnings.push(`Mirroring will delete ${deletions.length} songs from the destination playlist(s).`);
    }

    return {
      added: toAdd.map(t => ({ id: t.id, name: t.name, artists: t.artists, album: t.album, durationMs: t.durationMs, isExplicit: t.isExplicit })),
      existing,
      duplicates,
      skipped: filterResult.skippedNames,
      deletions,
      estimatedCalls,
      estimatedTimeSec,
      warnings
    };
  }

  // Execute actual Sync
  public async executeSync(
    profileId: string,
    isOffline: boolean,
    progressCallback?: (status: { step: string; percent: number }) => void
  ): Promise<SyncLog> {
    const startTime = Date.now();
    const profile = this.db.getProfile(profileId);
    if (!profile) {
      throw new Error(`Sync Profile not found: ${profileId}`);
    }

    if (isOffline) {
      // Place in queue
      this.db.addToQueue(profileId);
      throw new Error('Offline Mode: The sync job has been added to the execution queue and will run when internet connection returns.');
    }

    progressCallback?.({ step: 'Analyzing playlists...', percent: 10 });
    
    // Run preview to get delta lists
    const preview = await this.previewSync(profile, false);
    
    const addedCount = preview.added.length;
    const skippedCount = preview.skipped.length + preview.duplicates.length;
    const deletedCount = preview.deletions.length;
    const details: string[] = [];

    // Map source/destination names for logs
    const sourceNames = profile.sources.map(id => this.db.getPlaylist(id)?.name || id);
    const destNames = profile.destinations.map(id => this.db.getPlaylist(id)?.name || id);

    try {
      // 1. Delete extra tracks if Mirror mode
      if (profile.mode === 'mirror' && preview.deletions.length > 0) {
        progressCallback?.({ step: 'Removing extra tracks for Mirror mode...', percent: 30 });
        for (const destId of profile.destinations) {
          // Filter deletions to match tracks that actually exist in this destination
          // (To avoid trying to delete track URIs that aren't in this specific target)
          const targetTracks = this.db.getPlaylistTracks(destId);
          const tracksToDelete = targetTracks
            .filter(t => preview.deletions.includes(t.id) && t.id)
            .map(t => `spotify:track:${t.id}`);

          if (tracksToDelete.length > 0) {
            await this.spotify.removeTracksFromPlaylist(destId, tracksToDelete);
            details.push(`Removed ${tracksToDelete.length} extra tracks from destination: ${destId}`);
          }
        }
      }

      // 2. Add new tracks
      if (preview.added.length > 0) {
        progressCallback?.({ step: 'Adding new songs...', percent: 60 });
        const trackUris = preview.added
          .filter(t => t.id)
          .map(t => `spotify:track:${t.id}`);

        if (trackUris.length > 0) {
          for (const destId of profile.destinations) {
            await this.spotify.addTracksToPlaylist(destId, trackUris);
            details.push(`Added ${trackUris.length} tracks to destination: ${destId}`);
          }
        }
      }

      progressCallback?.({ step: 'Finalizing and updating caches...', percent: 90 });

      // Refresh target caches
      for (const destId of profile.destinations) {
        const rawTracks = await this.spotify.fetchPlaylistTracks(destId);
        const mapped = rawTracks.map(item => this.mapSpotifyTrack(item));
        this.db.savePlaylistTracks(destId, mapped);
        
        // Update track count on cached playlist
        const p = this.db.getPlaylist(destId);
        if (p) {
          p.trackCount = mapped.length;
          p.lastUpdated = Date.now();
          this.db.savePlaylist(p);
        }
      }

      const durationMs = Date.now() - startTime;
      const log = this.db.addLog({
        timestamp: new Date().toISOString(),
        durationMs,
        status: 'success',
        profileName: profile.name,
        mode: profile.mode,
        sources: sourceNames,
        destinations: destNames,
        addedCount,
        skippedCount,
        deletedCount,
        details: [
          `Sync successfully completed in ${Math.round(durationMs / 1000)} seconds.`,
          ...details,
          ...preview.added.map(t => `Added: ${t.name} by ${t.artists.join(', ')}`),
          ...preview.skipped.map(name => `Skipped filter: ${name}`),
          ...preview.duplicates.map(name => `Skipped duplicate: ${name}`)
        ]
      });

      // Update profile last run timestamp
      profile.lastRun = new Date().toISOString();
      this.db.saveProfile(profile);

      progressCallback?.({ step: 'Sync Completed successfully!', percent: 100 });
      return log;

    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const log = this.db.addLog({
        timestamp: new Date().toISOString(),
        durationMs,
        status: 'failed',
        profileName: profile.name,
        mode: profile.mode,
        sources: sourceNames,
        destinations: destNames,
        addedCount: 0,
        skippedCount: 0,
        deletedCount: 0,
        details: [
          `Sync failed after ${Math.round(durationMs / 1000)} seconds.`,
          `Error: ${err.message}`
        ]
      });
      throw err;
    }
  }
}
