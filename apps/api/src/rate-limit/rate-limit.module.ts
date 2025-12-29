import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Simple in-memory throttling (can be swapped to Redis storage later).
    // Default: 120 req/min per IP.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
})
export class RateLimitModule {}

