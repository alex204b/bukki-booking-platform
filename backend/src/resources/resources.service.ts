import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  async create(createResourceDto: CreateResourceDto, userId: string): Promise<Resource> {
    // Verify business ownership
    const business = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('business')
      .from('businesses', 'business')
      .where('business.id = :businessId', { businessId: createResourceDto.businessId })
      .andWhere('business.deletedAt IS NULL')
      .leftJoin('business.owner', 'owner')
      .addSelect('owner.id')
      .getOne();

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.owner?.id !== userId) {
      throw new ForbiddenException('You can only create resources for your own business');
    }

    const resource = this.resourceRepository.create(createResourceDto);
    return await this.resourceRepository.save(resource);
  }

  async findAll(businessId?: string): Promise<Resource[]> {
    const query = this.resourceRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.business', 'business')
      .leftJoinAndSelect('resource.user', 'user')
      .leftJoinAndSelect('resource.services', 'services')
      .where('resource.deletedAt IS NULL');

    if (businessId) {
      query.andWhere('resource.businessId = :businessId', { businessId });
    }

    query.orderBy('resource.sortOrder', 'ASC').addOrderBy('resource.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: string): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['business', 'user', 'services'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async update(id: string, updateResourceDto: UpdateResourceDto, userId: string): Promise<Resource> {
    const resource = await this.findOne(id);

    // Verify business ownership
    const business = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('business')
      .from('businesses', 'business')
      .where('business.id = :businessId', { businessId: resource.business.id })
      .andWhere('business.deletedAt IS NULL')
      .leftJoin('business.owner', 'owner')
      .addSelect('owner.id')
      .getOne();

    if (business.owner?.id !== userId) {
      throw new ForbiddenException('You can only update resources for your own business');
    }

    Object.assign(resource, updateResourceDto);
    return await this.resourceRepository.save(resource);
  }

  async remove(id: string, userId: string): Promise<void> {
    const resource = await this.findOne(id);

    // Verify business ownership
    const business = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('business')
      .from('businesses', 'business')
      .where('business.id = :businessId', { businessId: resource.business.id })
      .andWhere('business.deletedAt IS NULL')
      .leftJoin('business.owner', 'owner')
      .addSelect('owner.id')
      .getOne();

    if (business.owner?.id !== userId) {
      throw new ForbiddenException('You can only delete resources for your own business');
    }

    // Soft delete
    resource.deletedAt = new Date();
    await this.resourceRepository.save(resource);
  }

  async linkToService(resourceId: string, serviceId: string, userId: string): Promise<void> {
    const resource = await this.findOne(resourceId);

    // Verify business ownership
    const business = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('business')
      .from('businesses', 'business')
      .where('business.id = :businessId', { businessId: resource.business.id })
      .andWhere('business.deletedAt IS NULL')
      .leftJoin('business.owner', 'owner')
      .addSelect('owner.id')
      .getOne();

    if (business.owner?.id !== userId) {
      throw new ForbiddenException('You can only manage resources for your own business');
    }

    // Verify service belongs to same business
    const service = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('service')
      .from('services', 'service')
      .where('service.id = :serviceId', { serviceId })
      .andWhere('service.businessId = :businessId', { businessId: resource.business.id })
      .andWhere('service.deletedAt IS NULL')
      .getOne();

    if (!service) {
      throw new BadRequestException('Service not found or does not belong to this business');
    }

    // Check if already linked
    const existingLink = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('sr')
      .from('service_resources', 'sr')
      .where('sr.resourceId = :resourceId', { resourceId })
      .andWhere('sr.serviceId = :serviceId', { serviceId })
      .getOne();

    if (existingLink) {
      throw new BadRequestException('Resource is already linked to this service');
    }

    // Create link
    await this.resourceRepository.manager.query(
      `INSERT INTO service_resources ("serviceId", "resourceId", "createdAt")
       VALUES ($1, $2, NOW())`,
      [serviceId, resourceId]
    );
  }

  async unlinkFromService(resourceId: string, serviceId: string, userId: string): Promise<void> {
    const resource = await this.findOne(resourceId);

    // Verify business ownership
    const business = await this.resourceRepository.manager
      .createQueryBuilder()
      .select('business')
      .from('businesses', 'business')
      .where('business.id = :businessId', { businessId: resource.business.id })
      .andWhere('business.deletedAt IS NULL')
      .leftJoin('business.owner', 'owner')
      .addSelect('owner.id')
      .getOne();

    if (business.owner?.id !== userId) {
      throw new ForbiddenException('You can only manage resources for your own business');
    }

    // Delete link
    const result = await this.resourceRepository.manager.query(
      `DELETE FROM service_resources WHERE "resourceId" = $1 AND "serviceId" = $2`,
      [resourceId, serviceId]
    );

    if (result[1] === 0) {
      throw new NotFoundException('Resource-service link not found');
    }
  }
}
