import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('/admin/dashboard')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('/stats')
  async getStats() {
    return this.service.getStats();
  }
}
