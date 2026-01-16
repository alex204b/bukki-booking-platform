import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RequestType } from './entities/request.entity';

@ApiTags('Requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('unsuspension/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request unsuspension for suspended business (Business owner only)' })
  @ApiResponse({ status: 201, description: 'Unsuspension request created successfully' })
  async createUnsuspensionRequest(
    @Param('businessId') businessId: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    console.log(`[RequestsController] POST /requests/unsuspension/${businessId}`);
    console.log(`[RequestsController] User ID: ${req.user.id}`);
    console.log(`[RequestsController] Reason provided: ${body.reason ? 'Yes' : 'No'}`);
    
    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException('Reason is required');
    }
    
    const result = await this.requestsService.createUnsuspensionRequest(businessId, req.user.id, body.reason);
    console.log(`[RequestsController] Request created successfully with ID: ${result.id}`);
    return result;
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending requests (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved successfully' })
  async getPendingRequests(@Query('type') type?: RequestType, @Request() req?) {
    console.log(`[RequestsController] GET /requests/pending`);
    console.log(`[RequestsController] User ID: ${req?.user?.id}, Type filter: ${type || 'all'}`);
    
    const requests = await this.requestsService.getPendingRequests(type);
    console.log(`[RequestsController] Found ${requests.length} pending request(s)`);
    
    return requests;
  }

  @Get('business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all requests for a business' })
  @ApiResponse({ status: 200, description: 'Business requests retrieved successfully' })
  async getBusinessRequests(@Param('businessId') businessId: string, @Request() req) {
    console.log(`[RequestsController] GET /requests/business/${businessId}`);
    console.log(`[RequestsController] User ID: ${req.user.id}`);
    console.log(`[RequestsController] Business ID from param: ${businessId}`);
    
    try {
      const requests = await this.requestsService.getBusinessRequests(businessId);
      console.log(`[RequestsController] ✅ Found ${requests.length} request(s) for business ${businessId}`);
      
      if (requests.length > 0) {
        console.log(`[RequestsController] Request IDs:`, requests.map((r: any) => r.id));
      }
      
      // Return as plain array - no wrapping
      return requests;
    } catch (error: any) {
      console.error(`[RequestsController] ❌ ERROR in getBusinessRequests:`);
      console.error(`[RequestsController] Error message: ${error.message}`);
      console.error(`[RequestsController] Error code: ${error.code}`);
      console.error(`[RequestsController] Error stack:`, error.stack);
      
      // Return error response that frontend can handle
      throw error;
    }
  }
  
  @Get('test/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'TEST: Get requests with direct SQL (for debugging)' })
  async testGetRequests(@Param('businessId') businessId: string) {
    console.log(`[RequestsController] TEST endpoint called for business: ${businessId}`);
    
    try {
      // Direct SQL query to test
      const result = await this.requestsService.getBusinessRequests(businessId);
      return {
        success: true,
        businessId,
        count: result.length,
        requests: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a request by ID' })
  @ApiResponse({ status: 200, description: 'Request retrieved successfully' })
  async getRequestById(@Param('id') id: string) {
    return this.requestsService.getRequestById(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a request (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Request approved successfully' })
  async approveRequest(
    @Param('id') id: string,
    @Body() body: { response?: string },
    @Request() req,
  ) {
    return this.requestsService.approveRequest(id, req.user.id, body.response);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a request (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() body: { response: string },
    @Request() req,
  ) {
    if (!body.response || body.response.trim().length === 0) {
      throw new BadRequestException('Response is required');
    }
    return this.requestsService.rejectRequest(id, req.user.id, body.response);
  }
}

