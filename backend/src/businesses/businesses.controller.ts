import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, NotFoundException, UnauthorizedException, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BusinessStatus } from './entities/business.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { multerConfig } from '../common/config/multer.config';

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
  @ApiOperation({ summary: 'Get all businesses (paginated)' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'status', required: false, enum: BusinessStatus })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: BusinessStatus,
  ) {
    return this.businessesService.findAllPaginated(paginationDto, status);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search businesses with advanced filters' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('minRating') minRating?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minPrice') minPrice?: string,
    @Query('sortBy') sortBy?: 'rating' | 'distance' | 'price' | 'name',
    @Query('verified') verified?: string,
    @Query('amenities') amenities?: string,
    @Query('priceRange') priceRange?: string,
  ) {
    const amenitiesArray = amenities ? amenities.split(',').map(a => a.trim()) : undefined;
    return this.businessesService.searchBusinesses(
      query,
      category,
      location,
      minRating ? parseFloat(minRating) : undefined,
      minPrice ? parseFloat(minPrice) : undefined,
      maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      verified === 'true',
      amenitiesArray,
      priceRange,
    );
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby businesses' })
  @ApiResponse({ status: 200, description: 'Nearby businesses' })
  async getNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radiusRaw?: string,
    @Query('availableNow') availableNow?: string,
  ) {
    const latitude = parseFloat(lat as any);
    const longitude = parseFloat(lng as any);
    const radius = radiusRaw !== undefined ? parseFloat(radiusRaw as any) : undefined;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Invalid coordinates');
    }
    const results = await this.businessesService.getNearbyBusinesses(latitude, longitude, radius);
    if (availableNow === 'true') {
      const now = new Date();
      const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const minutes = now.getHours() * 60 + now.getMinutes();
      return results.filter((b: any) => {
        // Parse working hours if it's a JSON string
        let workingHoursData = b.workingHours;
        if (typeof workingHoursData === 'string') {
          try {
            workingHoursData = JSON.parse(workingHoursData);
          } catch (error) {
            console.error('Error parsing working hours:', error);
            return false;
          }
        }
        
        const wh = workingHoursData?.[day];
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
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getMyBusiness(@Request() req) {
    // For business owners, get their owned business
    if (req.user.role === 'business_owner') {
      try {
        const business = await this.businessesService.findByOwner(req.user.id);
        if (!business) {
          throw new NotFoundException('Business not found. Please complete the onboarding process.');
        }
        return business;
      } catch (error) {
        console.error('[getMyBusiness] Error fetching business:', {
          userId: req.user.id,
          userRole: req.user.role,
          error: error.message,
        });
        throw error;
      }
    }
    
    // For employees, get the first business they're a member of
    if (req.user.role === 'employee') {
      const businesses = await this.businessesService.getMyBusinesses(req.user.id);
      if (businesses.length === 0) {
        throw new NotFoundException('No business found. You are not a member of any business.');
      }
      // Return the first business (employees typically work for one business)
      return businesses[0];
    }
    
    throw new NotFoundException('Business not found');
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
    if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Only super admins can approve businesses');
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
    if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Only super admins can reject businesses');
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
    if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Only super admins can suspend businesses');
    }
    return this.businessesService.suspend(id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business statistics' })
  @ApiResponse({ status: 200, description: 'Business stats retrieved' })
  async getStats(@Param('id') id: string, @Request() req) {
    // Ensure user is authenticated
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Check if user owns the business or is super admin
    const business = await this.businessesService.findOne(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    
    // Convert IDs to strings for comparison to handle type mismatches
    const ownerId = String(business.owner?.id || '');
    const userId = String(req.user.id);
    
    if (ownerId !== userId && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('You do not have permission to view these statistics');
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

  @Get('categories/counts')
  @ApiOperation({ summary: 'Get business counts by category' })
  @ApiResponse({ status: 200, description: 'Category counts retrieved successfully' })
  async getCategoryCounts() {
    return this.businessesService.getCategoryCounts();
  }

  // Contacts CRUD
  @Post(':id/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add contact to business mailing list' })
  async addContact(@Param('id') id: string, @Body() body: { email: string; name?: string }, @Request() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) {
      throw new UnauthorizedException('You do not have permission to manage contacts for this business');
    }
    return this.businessesService.addContact(id, body.email, body.name);
  }

  @Get(':id/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List business contacts' })
  async listContacts(@Param('id') id: string, @Request() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) {
      throw new UnauthorizedException('You do not have permission to view contacts for this business');
    }
    return this.businessesService.listContacts(id);
  }

  @Delete(':id/contacts/:contactId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a contact' })
  async removeContact(@Param('id') id: string, @Param('contactId') contactId: string, @Request() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) {
      throw new UnauthorizedException('You do not have permission to remove contacts for this business');
    }
    return this.businessesService.removeContact(id, contactId);
  }

  @Post(':id/contacts/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email campaign to contacts' })
  async sendCampaign(@Param('id') id: string, @Body() body: { subject: string; html: string }, @Request() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (!(await this.businessesService.isOwnerOrMember(id, req.user.id))) {
      throw new UnauthorizedException('You do not have permission to send campaigns for this business');
    }
    return this.businessesService.sendCampaign(id, body.subject, body.html);
  }

  // Image upload endpoints
  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload images for business' })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user owns the business
    const business = await this.businessesService.findOne(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const ownerId = String(business.owner?.id || '');
    const userId = String(req.user.id);

    if (ownerId !== userId && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('You do not have permission to upload images for this business');
    }

    // Save file paths
    const imagePaths = files.map(file => `/uploads/businesses/${file.filename}`);
    return this.businessesService.addImages(id, imagePaths);
  }

  @Delete(':id/images/:imageIndex')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a business image by index' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  async deleteImage(
    @Param('id') id: string,
    @Param('imageIndex') imageIndex: string,
    @Request() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user owns the business
    const business = await this.businessesService.findOne(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const ownerId = String(business.owner?.id || '');
    const userId = String(req.user.id);

    if (ownerId !== userId && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('You do not have permission to delete images for this business');
    }

    return this.businessesService.deleteImage(id, parseInt(imageIndex));
  }
}
