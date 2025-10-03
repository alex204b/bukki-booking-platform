import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BusinessStatus } from './entities/business.entity';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new business' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  async create(@Body() createBusinessDto: any, @Request() req) {
    return this.businessesService.create(createBusinessDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all businesses' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  async findAll(@Query('status') status?: BusinessStatus) {
    return this.businessesService.findAll(status);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search businesses' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
  ) {
    return this.businessesService.searchBusinesses(query, category, location);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby businesses' })
  @ApiResponse({ status: 200, description: 'Nearby businesses' })
  async getNearby(
    @Query('lat') latitude: number,
    @Query('lng') longitude: number,
    @Query('radius') radius?: number,
    @Query('availableNow') availableNow?: string,
  ) {
    const results = await this.businessesService.getNearbyBusinesses(latitude, longitude, radius);
    if (availableNow === 'true') {
      const now = new Date();
      const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const minutes = now.getHours() * 60 + now.getMinutes();
      return results.filter((b: any) => {
        const wh = b.workingHours?.[day];
        if (!wh || !wh.isOpen || !wh.openTime || !wh.closeTime) return false;
        const [oh, om] = wh.openTime.split(':').map(Number);
        const [ch, cm] = wh.closeTime.split(':').map(Number);
        const openM = oh * 60 + (om || 0);
        const closeM = ch * 60 + (cm || 0);
        return minutes >= openM && minutes <= closeM;
      });
    }
    return results;
  }

  @Get('my-business')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user business' })
  @ApiResponse({ status: 200, description: 'Business retrieved successfully' })
  async getMyBusiness(@Request() req) {
    return this.businessesService.findByOwner(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business by ID' })
  @ApiResponse({ status: 200, description: 'Business retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business' })
  @ApiResponse({ status: 200, description: 'Business updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateBusinessDto: any,
    @Request() req,
  ) {
    return this.businessesService.update(id, updateBusinessDto, req.user.id, req.user.role);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve business (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Business approved successfully' })
  async approve(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized');
    }
    return this.businessesService.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject business (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Business rejected successfully' })
  async reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized');
    }
    return this.businessesService.reject(id, body.reason);
  }

  @Post(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend business (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Business suspended successfully' })
  async suspend(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized');
    }
    return this.businessesService.suspend(id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business statistics' })
  @ApiResponse({ status: 200, description: 'Business stats retrieved' })
  async getStats(@Param('id') id: string, @Request() req) {
    // Check if user owns the business or is super admin
    const business = await this.businessesService.findOne(id);
    if (business.owner.id !== req.user.id && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized');
    }
    return this.businessesService.getBusinessStats(id);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a team member by email' })
  async inviteMember(@Param('id') id: string, @Body() body: { email: string }, @Request() req) {
    return this.businessesService.inviteMember(id, req.user.id, body.email);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active team members' })
  async listMembers(@Param('id') id: string, @Request() req) {
    return this.businessesService.listMembers(id, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a team member' })
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    return this.businessesService.removeMember(id, req.user.id, memberId);
  }

  @Post(':id/members/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a team invitation' })
  async acceptInvite(@Param('id') id: string, @Body() body: { email: string }, @Request() req) {
    return this.businessesService.acceptInvite(id, req.user.id, body.email);
  }

  @Get('invites/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending invites for current user by email' })
  async myInvites(@Request() req) {
    return this.businessesService.listInvitesByEmail(req.user.email);
  }

  // Contacts CRUD
  @Post(':id/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add contact to business mailing list' })
  async addContact(@Param('id') id: string, @Body() body: { email: string; name?: string }, @Request() req) {
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) throw new Error('Unauthorized');
    return this.businessesService.addContact(id, body.email, body.name);
  }

  @Get(':id/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List business contacts' })
  async listContacts(@Param('id') id: string, @Request() req) {
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) throw new Error('Unauthorized');
    return this.businessesService.listContacts(id);
  }

  @Delete(':id/contacts/:contactId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a contact' })
  async removeContact(@Param('id') id: string, @Param('contactId') contactId: string, @Request() req) {
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) throw new Error('Unauthorized');
    return this.businessesService.removeContact(id, contactId);
  }

  @Post(':id/contacts/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email campaign to contacts' })
  async sendCampaign(@Param('id') id: string, @Body() body: { subject: string; html: string }, @Request() req) {
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) throw new Error('Unauthorized');
    return this.businessesService.sendCampaign(id, body.subject, body.html);
  }
}
