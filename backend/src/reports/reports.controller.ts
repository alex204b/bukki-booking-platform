import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export class CreateReportDto {
  type: 'user' | 'business';
  reason: 'no-show' | 'false-info' | 'inappropriate' | 'spam' | 'other';
  details: string;
  reportedUserId?: number;
  reportedBusinessId?: number;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReport(@Body() createReportDto: CreateReportDto, @Request() req) {
    return this.reportsService.createReport(
      createReportDto.type as any,
      createReportDto.reason as any,
      createReportDto.details,
      req.user.id,
      createReportDto.reportedUserId,
      createReportDto.reportedBusinessId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getReports(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.reportsService.getReports(page, limit);
  }
}
