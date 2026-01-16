import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { MessageType } from '../entities/chat-message.entity';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @IsOptional()
  metadata?: {
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    mimeType?: string;
    replyToMessageId?: string;
  };
}

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsOptional()
  initialMessage?: string;
}
