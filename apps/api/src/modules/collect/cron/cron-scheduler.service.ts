import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CollectService } from '../collect.service';
import { CronParser } from './cron-parser';

@Injectable()
export class CronSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronSchedulerService.name);
  private activeJobs = new Map<number, NodeJS.Timeout>();
  private lastExecutedMinute = new Map<number, number>(); // Track last executed minute per job

  constructor(@Inject(forwardRef(() => CollectService)) private readonly collect: CollectService) {}

  onModuleInit() {
    this.initializeSchedules();
  }

  onModuleDestroy() {
    this.clearAllSchedules();
  }

  private async initializeSchedules() {
    try {
      const result = await this.collect.listJobs();
      for (const job of result.items) {
        if (job.status === 1 && job.cron) {
          this.scheduleJob(job.id, job.cron);
        }
      }
      this.logger.log(`Initialized ${this.activeJobs.size} cron schedules`);
    } catch (error) {
      this.logger.error('Failed to initialize schedules', error);
    }
  }

  scheduleJob(jobId: number, cronExpression: string) {
    // Clear existing schedule if any
    this.clearJobSchedule(jobId);

    try {
      CronParser.parse(cronExpression); // Validate
      // Set up interval to check every 60 seconds
      // First check will happen after 60 seconds, not immediately
      const timer = setInterval(() => this.checkAndEnqueueJob(jobId).catch(() => void 0), 60000);
      this.activeJobs.set(jobId, timer);
      this.logger.log(`Scheduled job ${jobId} with cron: ${cronExpression}`);
    } catch (error) {
      this.logger.error(`Failed to schedule job ${jobId}: ${error}`);
    }
  }

  clearJobSchedule(jobId: number) {
    const timer = this.activeJobs.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.activeJobs.delete(jobId);
    }
  }

  private async checkAndEnqueueJob(jobId: number) {
    try {
      const result = await this.collect.listJobs();
      const job = result.items.find((j) => j.id === jobId);

      if (!job || job.status !== 1 || !job.cron) {
        this.clearJobSchedule(jobId);
        return;
      }

      if (CronParser.isTimeToRun(job.cron)) {
        const now = new Date();
        const currentMinute = now.getHours() * 60 + now.getMinutes();

        // Prevent duplicate execution in the same minute
        if (this.lastExecutedMinute.get(jobId) === currentMinute) {
          return;
        }

        // Check if there are active runs
        const runsResult = await this.collect.listRuns({
          page: 1,
          pageSize: 1,
          jobId,
          status: 0, // pending
        });

        if (runsResult.items.length === 0) {
          // No pending runs, create one
          await this.collect.createRun(jobId);
          this.lastExecutedMinute.set(jobId, currentMinute);
          this.logger.log(`Enqueued job ${jobId} via cron schedule`);
        }
      }
    } catch (error) {
      this.logger.error(`Error checking job ${jobId}`, error);
    }
  }

  private clearAllSchedules() {
    for (const timer of this.activeJobs.values()) {
      clearInterval(timer);
    }
    this.activeJobs.clear();
  }

  async updateJobSchedule(jobId: number, cronExpression: string, status: number) {
    if (status === 1 && cronExpression) {
      this.scheduleJob(jobId, cronExpression);
    } else {
      this.clearJobSchedule(jobId);
    }
  }
}
