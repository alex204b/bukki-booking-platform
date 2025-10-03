import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiResponse({ status: 200, description: 'File uploaded successfully' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!this.filesService.validateFileType(file, allowedTypes)) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    // Validate file size (5MB max)
    if (!this.filesService.validateFileSize(file, 5)) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    const fileUrl = await this.filesService.uploadFile(file, folder);
    return { url: fileUrl };
  }

  @Post('upload-multiple')
  @UseInterceptors(FileInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  async uploadMultipleFiles(
    @UploadedFile() files: Express.Multer.File[],
    @Body('folder') folder?: string
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    // Validate each file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!this.filesService.validateFileType(file, allowedTypes)) {
        throw new Error(`Invalid file type for ${file.originalname}. Only images are allowed.`);
      }
      if (!this.filesService.validateFileSize(file, 5)) {
        throw new Error(`File too large for ${file.originalname}. Maximum size is 5MB.`);
      }
    }

    const fileUrls = await this.filesService.uploadMultipleFiles(files, folder);
    return { urls: fileUrls };
  }
}
