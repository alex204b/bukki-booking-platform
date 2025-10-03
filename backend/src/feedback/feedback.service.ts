import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackType } from './entities/feedback.entity';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private emailService: EmailService,
  ) {}

  async createFeedback(
    type: FeedbackType,
    rating: number,
    content: string,
    userId?: number,
    userEmail?: string,
    userName?: string,
  ): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      type,
      rating,
      content,
      userId,
      userEmail,
      userName,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    // Send email notification to admin
    await this.sendFeedbackNotification(savedFeedback);

    return savedFeedback;
  }

  async getFeedback(page: number = 1, limit: number = 10): Promise<{ feedback: Feedback[]; total: number }> {
    const [feedback, total] = await this.feedbackRepository.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { feedback, total };
  }

  async getFeedbackStats(): Promise<{ averageRating: number; totalFeedback: number; ratingDistribution: Record<number, number> }> {
    const feedback = await this.feedbackRepository.find();
    
    if (feedback.length === 0) {
      return { averageRating: 0, totalFeedback: 0, ratingDistribution: {} };
    }

    const totalRating = feedback.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / feedback.length;

    const ratingDistribution = feedback.reduce((dist, f) => {
      dist[f.rating] = (dist[f.rating] || 0) + 1;
      return dist;
    }, {} as Record<number, number>);

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedback: feedback.length,
      ratingDistribution,
    };
  }

  private async sendFeedbackNotification(feedback: Feedback): Promise<void> {
    const subject = `New Feedback: ${feedback.type} - Rating: ${feedback.rating}/5`;
    const content = `
      <h2>New Feedback Submitted</h2>
      <p><strong>Type:</strong> ${feedback.type}</p>
      <p><strong>Rating:</strong> ${feedback.rating}/5</p>
      <p><strong>Content:</strong> ${feedback.content}</p>
      <p><strong>User ID:</strong> ${feedback.userId || 'Anonymous'}</p>
      <p><strong>User Email:</strong> ${feedback.userEmail || 'N/A'}</p>
      <p><strong>User Name:</strong> ${feedback.userName || 'N/A'}</p>
      <p><strong>Date:</strong> ${feedback.createdAt}</p>
    `;

    // Send to the same email used for SMTP service
    const adminEmail = process.env.SMTP_USER || 'bukki.no.replay@gmail.com';
    await this.emailService.sendEmail(adminEmail, subject, content);
  }
}
