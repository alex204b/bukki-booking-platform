import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log an action
   */
  async log(
    action: AuditAction,
    entityType: string,
    options: {
      userId?: string;
      entityId?: string;
      changes?: { before?: any; after?: any };
      ipAddress?: string;
      userAgent?: string;
      description?: string;
    },
  ): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      action,
      entityType,
      userId: options.userId,
      entityId: options.entityId,
      changes: options.changes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      description: options.description,
    });

    return this.auditLogRepository.save(log);
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        entityType,
        entityId,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Get user activity logs
   */
  async getUserLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Clean up old audit logs (older than 1 year)
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }
}

