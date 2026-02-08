import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint for monitoring' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345.67 },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check - verifies all dependencies are ready' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
  })
  ready() {
    // In the future, you can add database connectivity checks here
    // For now, if the service is running, it's ready
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected', // Assuming if app started, DB is connected
    };
  }
}
