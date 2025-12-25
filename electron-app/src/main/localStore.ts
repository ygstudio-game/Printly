import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { PrintJob } from '../types';

// Define the structure of our data file
interface StoreData {
  jobs: PrintJob[];
  settings: Record<string, any>; // ✅ New: Allows storing arbitrary settings
}

export class LocalStore {
  private filePath: string;
  private data: StoreData;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'jobs-queue.json');
    this.data = this.load();
  }
  clearAll() {
    console.log('🧹 Clearing all local store data...');
    
    this.data = {
      jobs: [],
      settings: {}
    };
    
    this.save();
    console.log('✅ Local store cleared');
  }
    clearSettings() {
    this.data.settings = {};
    this.save();
  }
    clearJobs() {
    this.data.jobs = [];
    this.save();
  }
  private load(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const rawData = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(rawData);
        
        // Ensure both fields exist (backward compatibility)
        return {
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
          settings: parsed.settings || {}
        };
      }
    } catch (error) {
      console.error('Error loading local store:', error);
    }
    // Default initial state
    return { jobs: [], settings: {} };
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving local store:', error);
    }
  }

  // --- JOB METHODS ---
  getAllJobs(): PrintJob[] {
    return this.data.jobs;
  }
  getCompletedJobs(): PrintJob[] {
    return this.data.jobs.filter(j => j.status === 'completed');
  }
    getFailedJobs(): PrintJob[] {
    return this.data.jobs.filter(j => j.status === 'failed');
  }
   cleanupOldJobs(maxAgeHours: number = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    const initialCount = this.data.jobs.length;
    
    this.data.jobs = this.data.jobs.filter(job => {
      // Always keep pending/printing jobs
      if (job.status === 'pending' || job.status === 'printing') {
        return true;
      }
      
      // Remove old completed/failed jobs
      const jobTime = new Date(job.timestamps?.created || 0).getTime();
      return jobTime > cutoffTime;
    });
    
    const removed = initialCount - this.data.jobs.length;
    if (removed > 0) {
      this.save();
      console.log(`🧹 Cleaned up ${removed} old jobs`);
    }
    
    return removed;
  }
  getJobCount(status?: string): number {
    if (!status) return this.data.jobs.length;
    return this.data.jobs.filter(j => j.status === status).length;
  }
  getPendingJobs(): PrintJob[] {
    return this.data.jobs.filter(j => j.status === 'pending' || j.status === 'printing');
  }

  addJob(job: PrintJob) {
    if (!this.data.jobs.find(j => j._id === job._id)) {
      this.data.jobs.unshift(job);
      this.save();
    }
  }

  updateJob(updatedJob: PrintJob) {
    const index = this.data.jobs.findIndex(j => j._id === updatedJob._id);
    if (index > -1) {
      this.data.jobs[index] = updatedJob;
      this.save();
    }
  }

  updateJobStatus(jobId: string, status: string) {
     const job = this.data.jobs.find(j => j._id === jobId);
     if (job) {
       job.status = status as any;
       this.save();
     }
  }

  removeJob(jobId: string) {
    this.data.jobs = this.data.jobs.filter(j => j._id !== jobId);
    this.save();
  }

  // --- SETTINGS METHODS (Fixes your error) ---

  set(key: string, value: any) {
    this.data.settings[key] = value;
    this.save();
  }

  get(key: string): any {
    return this.data.settings[key];
  }
    delete(key: string) {
    if (this.data.settings[key] !== undefined) {
      delete this.data.settings[key];
      this.save();
    }
  }
}
