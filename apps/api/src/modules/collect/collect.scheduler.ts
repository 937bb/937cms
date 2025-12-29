import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CollectService } from './collect.service';
import { GoCollectorRunnerService } from './runner/go-collector-runner.service';

@Injectable()
export class CollectSchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly collect: CollectService,
    private readonly runner: GoCollectorRunnerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.collect
        .reapStaleRuns()
        .then(() => this.collect.enqueueDueJobs())
        .then(() => this.runner.kick())
        .catch(() => void 0);
    }, 10_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
