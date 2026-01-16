import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { TrustScoreService } from './trust-score.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly trustScoreService: TrustScoreService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users (paginated, Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  async findAll(
    @Request() req,
    @Query() paginationDto: PaginationDto,
    @Query('role') role?: UserRole,
  ) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized');
    }
    return this.usersService.findAllPaginated(paginationDto, role);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for users by email (Business owners only)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiQuery({ name: 'email', required: true, type: String })
  async searchByEmail(
    @Query('email') email: string,
    @Request() req,
  ) {
    // Only business owners and employees can search for users
    if (req.user.role !== UserRole.BUSINESS_OWNER && req.user.role !== UserRole.EMPLOYEE) {
      throw new Error('Unauthorized');
    }
    
    const user = await this.usersService.findByEmail(email);
    return user ? [user] : [];
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateData: any) {
    return this.usersService.update(req.user.id, updateData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() updateData: any, @Request() req) {
    return this.usersService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async deactivate(@Param('id') id: string, @Request() req) {
    await this.usersService.deactivate(id);
    return { message: 'User deactivated successfully' };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async activate(@Param('id') id: string, @Request() req) {
    await this.usersService.activate(id);
    return { message: 'User activated successfully' };
  }

  @Get('profile/trust-score')
  @ApiOperation({ summary: 'Get current user trust score breakdown' })
  @ApiResponse({ status: 200, description: 'Trust score retrieved successfully' })
  async getTrustScore(@Request() req) {
    return this.trustScoreService.getTrustScoreBreakdown(req.user.id);
  }

  @Get(':id/trust-score')
  @ApiOperation({ summary: 'Get user trust score (for business owners viewing customers)' })
  @ApiResponse({ status: 200, description: 'Trust score retrieved successfully' })
  async getUserTrustScore(@Param('id') id: string, @Request() req) {
    // Business owners can view customer trust scores
    if (req.user.role !== 'business_owner' && req.user.role !== 'super_admin' && req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.trustScoreService.getTrustScoreBreakdown(id);
  }
}
