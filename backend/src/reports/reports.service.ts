import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportType, ReportReason } from './entities/report.entity';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    private emailService: EmailService,
  ) {}

  async createReport(
    type: ReportType,
    reason: ReportReason,
    details: string,
    reporterId: number,
    reportedUserId?: number,
    reportedBusinessId?: number,
  ): Promise<Report> {
    const report = this.reportsRepository.create({
      type,
      reason,
      details,
      reporterId,
      reportedUserId,
      reportedBusinessId,
    });

    const savedReport = await this.reportsRepository.save(report);

    // Send email notification to admin
    await this.sendReportNotification(savedReport);

    return savedReport;
  }

  async getReports(page: number = 1, limit: number = 10): Promise<{ reports: Report[]; total: number }> {
    const [reports, total] = await this.reportsRepository.findAndCount({
      relations: ['reporter', 'reportedUser', 'reportedBusiness'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { reports, total };
  }

  async updateReportStatus(id: number, status: string): Promise<Report> {
    const report = await this.reportsRepository.findOne({ where: { id } });
    if (!report) {
      throw new Error('Report not found');
    }

    report.status = status as any;
    return this.reportsRepository.save(report);
  }

  private async sendReportNotification(report: Report): Promise<void> {
    const subject = `New Report: ${report.type} - ${report.reason}`;
    const content = `
      <h2>New Report Submitted</h2>
      <p><strong>Type:</strong> ${report.type}</p>
      <p><strong>Reason:</strong> ${report.reason}</p>
      <p><strong>Details:</strong> ${report.details}</p>
      <p><strong>Reporter ID:</strong> ${report.reporterId}</p>
      <p><strong>Reported User ID:</strong> ${report.reportedUserId || 'N/A'}</p>
      <p><strong>Reported Business ID:</strong> ${report.reportedBusinessId || 'N/A'}</p>
      <p><strong>Date:</strong> ${report.createdAt}</p>
    `;

    // Send to the same email used for SMTP service
    const adminEmail = process.env.SMTP_USER || 'bukki.no.replay@gmail.com';
    await this.emailService.sendEmail(adminEmail, subject, content);
  }
}
