import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Request, RequestType, RequestStatus } from './entities/request.entity';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { BusinessesService } from '../businesses/businesses.service';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(forwardRef(() => BusinessesService))
    private businessesService: BusinessesService,
  ) {}

  /**
   * Create an unsuspension request
   */
  async createUnsuspensionRequest(
    businessId: string,
    userId: string,
    reason: string,
  ): Promise<Request> {
    console.log(`[RequestsService] createUnsuspensionRequest called`);
    console.log(`[RequestsService] Business ID: ${businessId}, User ID: ${userId}`);
    console.log(`[RequestsService] Reason length: ${reason.length}`);

    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      console.error(`[RequestsService] Business not found: ${businessId}`);
      throw new NotFoundException('Business not found');
    }

    console.log(`[RequestsService] Business found: ${business.name}, Status: ${business.status}`);
    console.log(`[RequestsService] Owner ID: ${business.owner.id}, Requested User ID: ${userId}`);

    if (business.owner.id !== userId) {
      console.error(`[RequestsService] Unauthorized: Owner ID mismatch`);
      throw new BadRequestException('Only the business owner can request unsuspension');
    }

    if (business.status !== 'suspended') {
      console.error(`[RequestsService] Business not suspended: ${business.status}`);
      throw new BadRequestException('Business is not suspended');
    }

    // Check for existing pending request (rate limiting - 24 hours)
    console.log(`[RequestsService] Checking for existing pending requests...`);
    const existingRequest = await this.requestRepository.findOne({
      where: {
        business: { id: businessId },
        requestType: RequestType.UNSUSPENSION,
        status: RequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      const hoursSinceRequest = (Date.now() - new Date(existingRequest.requestedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceRequest < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceRequest);
        console.log(`[RequestsService] Rate limit: Request exists from ${Math.floor(hoursSinceRequest)} hours ago`);
        throw new BadRequestException(
          `You already submitted a request ${Math.floor(hoursSinceRequest)} hours ago. Please wait ${hoursRemaining} more hours before submitting another request.`
        );
      }
    }

    try {
      // FIRST: Verify the requests table exists
      console.log(`[RequestsService] Checking if requests table exists...`);
      const tableCheck = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'requests'
        );
      `);
      
      if (!tableCheck[0].exists) {
        console.error(`[RequestsService] ❌ CRITICAL: Requests table does NOT exist!`);
        throw new BadRequestException(
          'Requests table does not exist. Please run: npm run ensure:requests-table'
        );
      }
      console.log(`[RequestsService] ✅ Requests table exists`);

      console.log(`[RequestsService] Preparing to insert request into database...`);
      const metadata = {
        businessName: business.name,
        ownerEmail: business.owner.email,
        ownerId: business.owner.id,
        ownerFirstName: business.owner.firstName,
        ownerLastName: business.owner.lastName,
      };
      
      console.log(`[RequestsService] Insert values:`, {
        businessId,
        requestType: 'unsuspension',
        status: 'pending',
        reasonLength: reason.length,
        metadataKeys: Object.keys(metadata),
      });

      // CRITICAL: Use DataSource directly to ensure INSERT commits to database
      // Using repository.query() might not commit properly
      console.log(`[RequestsService] Using DataSource directly for INSERT...`);
      const result = await this.dataSource.query(
        `INSERT INTO requests (
          "businessId",
          "requestType",
          status,
          reason,
          "requestedAt",
          metadata,
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, "createdAt", "updatedAt"`,
        [
          businessId,
          'unsuspension',
          'pending',
          reason,
          new Date(),
          JSON.stringify(metadata),
          new Date(),
          new Date(),
        ]
      );

      console.log(`[RequestsService] INSERT query executed, result:`, result);
      
      if (!result || result.length === 0) {
        console.error(`[RequestsService] CRITICAL: INSERT returned no result!`);
        throw new Error('INSERT query returned no result');
      }

      const requestId = result[0].id;
      console.log(`[RequestsService] ✅ Request inserted with ID: ${requestId}`);

      // CRITICAL: Wait a moment and verify multiple times to ensure data is persisted
      console.log(`[RequestsService] Verifying request exists in database (immediate check)...`);
      let verifyResult = await this.dataSource.query(
        `SELECT id, "businessId", "requestType", status, "createdAt", "requestedAt"
         FROM requests 
         WHERE id = $1`,
        [requestId]
      );

      console.log(`[RequestsService] Immediate verification result:`, verifyResult);

      if (!verifyResult || verifyResult.length === 0) {
        console.error(`[RequestsService] ❌ CRITICAL: Request not found immediately after insert! ID: ${requestId}`);
        
        // Try one more time after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        verifyResult = await this.dataSource.query(
          `SELECT id, "businessId", "requestType", status 
           FROM requests 
           WHERE id = $1`,
          [requestId]
        );
        
        if (!verifyResult || verifyResult.length === 0) {
          console.error(`[RequestsService] ❌ CRITICAL: Request still not found after retry!`);
          console.error(`[RequestsService] This suggests the INSERT did not persist to the database.`);
          throw new Error('Request not found in database after insert - data may not have been persisted');
        }
      }

      console.log(`[RequestsService] ✅ Verified request exists in database:`, {
        id: verifyResult[0].id,
        businessId: verifyResult[0].businessId,
        requestType: verifyResult[0].requestType,
        status: verifyResult[0].status,
      });

      // Also check if we can find it by businessId
      const businessCheck = await this.dataSource.query(
        `SELECT COUNT(*) as count 
         FROM requests 
         WHERE "businessId" = $1 AND "requestType" = 'unsuspension' AND status = 'pending'`,
        [businessId]
      );
      console.log(`[RequestsService] Total pending unsuspension requests for business ${businessId}: ${businessCheck[0].count}`);

      // Get the saved request to return (using TypeORM)
      const savedRequest = await this.requestRepository.findOne({
        where: { id: requestId },
        relations: ['business'],
      });

      if (!savedRequest) {
        console.error(`[RequestsService] CRITICAL: TypeORM findOne returned null for ID: ${requestId}`);
        throw new Error('Failed to retrieve saved request via TypeORM');
      }

      console.log(`[RequestsService] ✅ Retrieved request via TypeORM:`, {
        id: savedRequest.id,
        businessId: savedRequest.business?.id,
        requestType: savedRequest.requestType,
        status: savedRequest.status,
      });

      // Update businesses table for backward compatibility
      console.log(`[RequestsService] Updating businesses table...`);
      business.unsuspensionRequestedAt = new Date();
      business.unsuspensionRequestReason = reason;
      await this.businessRepository.save(business);
      console.log(`[RequestsService] ✅ Businesses table updated`);

      return savedRequest;
    } catch (error: any) {
      console.error(`[RequestsService] ❌ ERROR in createUnsuspensionRequest:`);
      console.error(`[RequestsService] Error message: ${error.message}`);
      console.error(`[RequestsService] Error code: ${error.code}`);
      console.error(`[RequestsService] Error detail: ${error.detail}`);
      console.error(`[RequestsService] Error stack:`, error.stack);
      
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('relation "requests"')) {
        console.error(`[RequestsService] Table does not exist!`);
        throw new BadRequestException(
          'Requests table not found. Run: npm run ensure:requests-table'
        );
      }
      
      throw error;
    }
  }

  /**
   * Create a suspension request/record
   */
  async createSuspensionRequest(
    businessId: string,
    adminId: string,
    reason: string,
  ): Promise<Request> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Create suspension request record using raw SQL to ensure persistence
    const result = await this.requestRepository.query(
      `INSERT INTO requests (
        "businessId",
        "requestType",
        status,
        reason,
        "requestedAt",
        "respondedAt",
        "respondedBy",
        "adminResponse",
        metadata,
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        businessId,
        RequestType.SUSPENSION,
        RequestStatus.APPROVED,
        reason,
        new Date(),
        new Date(),
        adminId,
        `Business suspended. Reason: ${reason}`,
        JSON.stringify({
          businessName: business.name,
          ownerEmail: business.owner.email,
          ownerId: business.owner.id,
          ownerFirstName: business.owner.firstName,
          ownerLastName: business.owner.lastName,
          action: 'suspension',
        }),
        new Date(),
        new Date(),
      ]
    );

    const requestId = result[0].id;
    
    // Verify and return the saved request
    const savedRequest = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['business', 'respondedBy'],
    });

    if (!savedRequest) {
      throw new Error('Failed to save suspension request');
    }

    return savedRequest;
  }

  /**
   * Get all pending requests
   */
  async getPendingRequests(requestType?: RequestType): Promise<Request[]> {
    console.log(`[RequestsService] getPendingRequests called, type filter: ${requestType || 'all'}`);
    
    try {
      // First check with raw SQL
      let rawQuery = `SELECT id, "businessId", "requestType", status, "requestedAt", "createdAt"
                      FROM requests 
                      WHERE status = 'pending'`;
      const params: any[] = [];
      
      if (requestType) {
        rawQuery += ` AND "requestType" = $1`;
        params.push(requestType);
      }
      
      rawQuery += ` ORDER BY "requestedAt" DESC`;
      
      console.log(`[RequestsService] Executing raw SQL query...`);
      const rawResults = await this.dataSource.query(rawQuery, params);
      console.log(`[RequestsService] Raw SQL found ${rawResults.length} pending request(s)`);
      
      if (rawResults.length > 0) {
        console.log(`[RequestsService] Raw results:`, rawResults.map((r: any) => ({
          id: r.id,
          businessId: r.businessId,
          requestType: r.requestType,
          requestedAt: r.requestedAt,
        })));
      }

      // Then use TypeORM
      const queryBuilder = this.requestRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.business', 'business')
        .leftJoinAndSelect('business.owner', 'owner')
        .leftJoinAndSelect('request.respondedBy', 'respondedBy')
        .where('request.status = :status', { status: RequestStatus.PENDING });

      if (requestType) {
        queryBuilder.andWhere('request.requestType = :requestType', { requestType });
      }

      const requests = await queryBuilder.orderBy('request.requestedAt', 'DESC').getMany();
      console.log(`[RequestsService] TypeORM found ${requests.length} pending request(s)`);

      // If raw SQL found results but TypeORM didn't, log warning
      if (rawResults.length > 0 && requests.length === 0) {
        console.warn(`[RequestsService] ⚠️  WARNING: Raw SQL found ${rawResults.length} requests but TypeORM found 0!`);
      }

      return requests;
    } catch (error: any) {
      console.error(`[RequestsService] ❌ ERROR in getPendingRequests:`);
      console.error(`[RequestsService] Error message: ${error.message}`);
      console.error(`[RequestsService] Error code: ${error.code}`);
      throw error;
    }
  }

  /**
   * Get a request by ID
   */
  async getRequestById(id: string): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['business', 'business.owner', 'respondedBy'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  /**
   * Get requests for a specific business
   * Returns plain objects - NO TypeORM entities to avoid any joins
   */
  async getBusinessRequests(businessId: string): Promise<any[]> {
    console.log(`[RequestsService] getBusinessRequests called for business: ${businessId}`);
    
    try {
      // Use raw SQL ONLY - no TypeORM, no entities, no joins
      console.log(`[RequestsService] Querying with raw SQL (plain objects, no joins)...`);
      console.log(`[RequestsService] Looking for businessId: ${businessId}`);
      
      // First, let's check if ANY requests exist at all
      const allRequests = await this.dataSource.query(`SELECT COUNT(*) as count FROM requests`);
      console.log(`[RequestsService] Total requests in database: ${allRequests[0].count}`);
      
      // Check what businessIds exist in requests
      const businessIds = await this.dataSource.query(`SELECT DISTINCT "businessId" FROM requests LIMIT 10`);
      console.log(`[RequestsService] Business IDs in requests table:`, businessIds.map((b: any) => b.businessId));
      
      const rawResults = await this.dataSource.query(
        `SELECT 
          r.id,
          r."businessId",
          r."requestType",
          r.status,
          r.reason,
          r."adminResponse",
          r."requestedAt",
          r."respondedAt",
          r."respondedBy",
          r.metadata,
          r."createdAt",
          r."updatedAt"
         FROM requests r
         WHERE r."businessId" = $1
         ORDER BY r."requestedAt" DESC`,
        [businessId]
      );
      
      console.log(`[RequestsService] Found ${rawResults.length} request(s) for business ${businessId}`);
      
      if (rawResults.length > 0) {
        console.log(`[RequestsService] Request IDs:`, rawResults.map((r: any) => r.id));
      }

      // Return plain objects - NO Request entities to avoid TypeORM trying to load relations
      const requests = rawResults.map((r: any) => {
        return {
          id: r.id,
          businessId: r.businessId,
          requestType: r.requestType,
          status: r.status,
          reason: r.reason,
          adminResponse: r.adminResponse,
          requestedAt: r.requestedAt,
          respondedAt: r.respondedAt,
          respondedBy: r.respondedBy,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          // Include business as plain object with just ID
          business: {
            id: r.businessId
          }
        };
      });

      console.log(`[RequestsService] ✅ Returning ${requests.length} request(s) as plain objects`);
      return requests;
    } catch (error: any) {
      console.error(`[RequestsService] ❌ ERROR in getBusinessRequests:`);
      console.error(`[RequestsService] Error message: ${error.message}`);
      console.error(`[RequestsService] Error code: ${error.code}`);
      console.error(`[RequestsService] Error stack:`, error.stack);
      throw error;
    }
  }

  /**
   * Approve a request
   * If it's an unsuspension request, automatically unsuspend the business
   */
  async approveRequest(requestId: string, adminId: string, response?: string): Promise<Request> {
    console.log(`[RequestsService] approveRequest called for request: ${requestId}`);
    
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['business'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    console.log(`[RequestsService] Request found:`, {
      id: request.id,
      requestType: request.requestType,
      status: request.status,
      businessId: request.business?.id,
    });

    // Use raw SQL UPDATE to ensure persistence to remote database
    await this.dataSource.query(
      `UPDATE requests 
       SET status = $1, 
           "respondedAt" = $2, 
           "respondedBy" = $3, 
           "adminResponse" = $4,
           "updatedAt" = $5
       WHERE id = $6`,
      [
        RequestStatus.APPROVED,
        new Date(),
        adminId,
        response || 'Request approved',
        new Date(),
        requestId,
      ]
    );

    console.log(`[RequestsService] ✅ Request status updated to approved`);

    // If this is an unsuspension request, automatically unsuspend the business
    if (request.requestType === RequestType.UNSUSPENSION && request.business) {
      console.log(`[RequestsService] This is an unsuspension request - unsuspending business ${request.business.id}...`);
      
      try {
        await this.businessesService.unsuspend(request.business.id, adminId);
        console.log(`[RequestsService] ✅ Business ${request.business.id} has been unsuspended`);
      } catch (error: any) {
        console.error(`[RequestsService] ❌ Failed to unsuspend business:`, error.message);
        // Don't fail the request approval if unsuspension fails - log it and continue
        // The admin can manually unsuspend if needed
      }
    }

    // Verify and return updated request
    const updatedRequest = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['business', 'respondedBy'],
    });

    if (!updatedRequest) {
      throw new NotFoundException('Request not found after update');
    }

    console.log(`[RequestsService] ✅ Request approved successfully`);
    return updatedRequest;
  }

  /**
   * Reject a request
   */
  async rejectRequest(requestId: string, adminId: string, response: string): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Use raw SQL UPDATE to ensure persistence to remote database
    await this.requestRepository.query(
      `UPDATE requests 
       SET status = $1, 
           "respondedAt" = $2, 
           "respondedBy" = $3, 
           "adminResponse" = $4,
           "updatedAt" = $5
       WHERE id = $6`,
      [
        RequestStatus.REJECTED,
        new Date(),
        adminId,
        response,
        new Date(),
        requestId,
      ]
    );

    // Verify and return updated request
    const updatedRequest = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['business', 'respondedBy'],
    });

    if (!updatedRequest) {
      throw new NotFoundException('Request not found after update');
    }

    return updatedRequest;
  }
}

