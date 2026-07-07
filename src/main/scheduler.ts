import { DBStore, SyncSchedule } from './db';
import { SyncEngine } from './sync';

export class SyncScheduler {
  private db: DBStore;
  private syncEngine: SyncEngine;
  private intervalId: NodeJS.Timeout | null = null;
  private isOnline = true;
  private onSyncCompleteCallback?: () => void;

  constructor(db: DBStore, syncEngine: SyncEngine) {
    this.db = db;
    this.syncEngine = syncEngine;
  }

  // Set callback to notify the frontend that a background sync ran and data changed
  public onSyncComplete(callback: () => void) {
    this.onSyncCompleteCallback = callback;
  }

  // Update connectivity status
  public setOnlineStatus(online: boolean) {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    // If we transition from offline to online, process the queued jobs automatically
    if (online && wasOffline) {
      console.log('Internet connectivity restored. Processing offline sync queue...');
      this.processOfflineQueue();
    }
  }

  // Process pending offline sync queue
  public async processOfflineQueue(): Promise<void> {
    const queue = this.db.getQueue();
    if (queue.length === 0 || !this.isOnline) return;

    console.log(`Processing ${queue.length} pending queued sync jobs...`);
    
    // Copy queue to avoid mutation issues during iteration
    const jobs = [...queue];

    for (const job of jobs) {
      try {
        console.log(`Executing queued sync job ${job.id} for profile ${job.profileId}`);
        await this.syncEngine.executeSync(job.profileId, false);
        this.db.removeFromQueue(job.id);
        console.log(`Queued sync job ${job.id} completed successfully.`);
      } catch (err: any) {
        console.error(`Failed to execute queued sync job ${job.id}:`, err.message);
        // Remove anyway if the profile doesn't exist, or keep if transient error
        if (err.message.includes('Profile not found')) {
          this.db.removeFromQueue(job.id);
        }
      }
    }

    if (this.onSyncCompleteCallback) {
      this.onSyncCompleteCallback();
    }
  }

  // Calculate next run timestamp based on interval
  public calculateNextRun(interval: SyncSchedule['interval']): string | null {
    const now = new Date();
    switch (interval) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'startup':
        return null; // Run on startup does not schedule a next execution
      case 'manual':
      default:
        return null;
    }
  }

  // Start the scheduling loop
  public start() {
    if (this.intervalId) return;

    // Run startup jobs first
    this.executeStartupJobs();

    // Check schedules every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkSchedules();
    }, 60000);

    console.log('Sync Scheduler started.');
  }

  // Stop the scheduler
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Sync Scheduler stopped.');
    }
  }

  // Find and execute scheduled jobs that are due
  private async checkSchedules() {
    const schedules = this.db.getSchedules();
    const now = new Date();

    for (const schedule of schedules) {
      if (schedule.nextRun && new Date(schedule.nextRun) <= now) {
        console.log(`Schedule ${schedule.id} is due. Executing sync...`);
        
        try {
          // Execute sync. This will queue if offline
          await this.syncEngine.executeSync(schedule.profileId, !this.isOnline);
          console.log(`Scheduled sync for profile ${schedule.profileId} completed/queued successfully.`);
        } catch (err: any) {
          console.error(`Scheduled sync error for profile ${schedule.profileId}:`, err.message);
        } finally {
          // Calculate and save the next run time
          const nextRun = this.calculateNextRun(schedule.interval);
          this.db.saveSchedule({
            ...schedule,
            lastRun: now.toISOString(),
            nextRun
          });
        }
      }
    }

    if (this.onSyncCompleteCallback) {
      this.onSyncCompleteCallback();
    }
  }

  // Run startup jobs
  private async executeStartupJobs() {
    const schedules = this.db.getSchedules();
    const startupSchedules = schedules.filter(s => s.interval === 'startup');

    if (startupSchedules.length === 0) return;

    console.log(`Executing ${startupSchedules.length} startup sync jobs...`);
    const now = new Date().toISOString();

    for (const schedule of startupSchedules) {
      try {
        await this.syncEngine.executeSync(schedule.profileId, !this.isOnline);
        this.db.saveSchedule({
          ...schedule,
          lastRun: now
        });
      } catch (err: any) {
        console.error(`Startup sync error for profile ${schedule.profileId}:`, err.message);
      }
    }

    if (this.onSyncCompleteCallback) {
      this.onSyncCompleteCallback();
    }
  }
}
