import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createResourceDto: CreateResourceDto, @Request() req) {
    // JwtStrategy returns the full user entity as req.user, so the ID field is `id`
    return this.resourcesService.create(createResourceDto, req.user.id);
  }

  @Get()
  findAll(@Query('businessId') businessId?: string) {
    return this.resourcesService.findAll(businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
    @Request() req,
  ) {
    return this.resourcesService.update(id, updateResourceDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.resourcesService.remove(id, req.user.id);
  }

  @Post(':id/services/:serviceId')
  @UseGuards(JwtAuthGuard)
  linkToService(
    @Param('id') resourceId: string,
    @Param('serviceId') serviceId: string,
    @Request() req,
  ) {
    return this.resourcesService.linkToService(resourceId, serviceId, req.user.id);
  }

  @Delete(':id/services/:serviceId')
  @UseGuards(JwtAuthGuard)
  unlinkFromService(
    @Param('id') resourceId: string,
    @Param('serviceId') serviceId: string,
    @Request() req,
  ) {
    return this.resourcesService.unlinkFromService(resourceId, serviceId, req.user.id);
  }
}
