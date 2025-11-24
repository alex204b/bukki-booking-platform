import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessagesService } from './messages.service';

@Injectable()
export class MessagesScheduler {
  private readonly logger = new Logger(MessagesScheduler.name);

  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Run cleanup every day at 2 AM
   * Archives chat messages older than 90 days
   * Deletes archived chat messages older than 180 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleMessageCleanup() {
    this.logger.log('Starting scheduled message cleanup...');
    
    try {
      const result = await this.messagesService.cleanupOldMessages(90, 180);
      this.logger.log(
        `Message cleanup completed: ${result.archived} archived, ${result.deleted} deleted`,
      );
    } catch (error) {
      this.logger.error('Error during message cleanup:', error);
    }
  }

  /**
   * Clean up old system messages (promotional offers, team invitations) once a month
   * Runs on the 1st of every month at 3 AM
   */
  @Cron('0 3 1 * *')
  async handleSystemMessageCleanup() {
    this.logger.log('Starting scheduled system message cleanup...');
    
    try {
      const deleted = await this.messagesService.cleanupOldSystemMessages(365);
      this.logger.log(`System message cleanup completed: ${deleted} deleted`);
    } catch (error) {
      this.logger.error('Error during system message cleanup:', error);
    }
  }
}

