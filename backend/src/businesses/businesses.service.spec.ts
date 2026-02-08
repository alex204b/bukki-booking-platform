import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { Business, BusinessStatus } from './entities/business.entity';
import { BusinessMember, BusinessMemberStatus } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { EmailService } from '../common/services/email.service';
import { MessagesService } from '../messages/messages.service';
import { RequestsService } from '../requests/requests.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('BusinessesService', () => {
  let service: BusinessesService;
  let businessRepository: any;
  let businessMemberRepository: any;
  let businessContactRepository: any;
  let userRepository: any;
  let dataSource: any;
  let emailService: any;
  let messagesService: any;
  let requestsService: any;

  const mockBusiness = {
    id: 'business-1',
    name: 'Test Business',
    category: 'restaurant',
    address: '123 Test St',
    city: 'Test City',
    status: BusinessStatus.APPROVED,
    owner: { id: 'owner-1', email: 'owner@test.com' },
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.BUSINESS_OWNER,
  };

  beforeEach(async () => {
    // Create mocks
    const mockBusinessRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockBusinessMemberRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockBusinessContactRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
      transaction: jest.fn(),
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
    };

    const mockMessagesService = {
      createTeamInvitationMessage: jest.fn(),
    };

    const mockRequestsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        {
          provide: getRepositoryToken(Business),
          useValue: mockBusinessRepo,
        },
        {
          provide: getRepositoryToken(BusinessMember),
          useValue: mockBusinessMemberRepo,
        },
        {
          provide: getRepositoryToken(BusinessContact),
          useValue: mockBusinessContactRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
        {
          provide: RequestsService,
          useValue: mockRequestsService,
        },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
    businessRepository = module.get(getRepositoryToken(Business));
    businessMemberRepository = module.get(getRepositoryToken(BusinessMember));
    businessContactRepository = module.get(getRepositoryToken(BusinessContact));
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(getDataSourceToken());
    emailService = module.get(EmailService);
    messagesService = module.get(MessagesService);
    requestsService = module.get(RequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isOwnerOrMember', () => {
    it('should return true if user is the owner', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(null);

      const result = await service.isOwnerOrMember('business-1', 'owner-1');

      expect(result).toBe(true);
      expect(businessRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'business-1' },
        relations: ['owner'],
      });
    });

    it('should return true if user is an active member', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue({
        id: 'member-1',
        status: BusinessMemberStatus.ACTIVE,
      });

      const result = await service.isOwnerOrMember('business-1', 'user-2');

      expect(result).toBe(true);
      expect(businessMemberRepository.findOne).toHaveBeenCalled();
    });

    it('should return false if user is neither owner nor member', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(null);

      const result = await service.isOwnerOrMember('business-1', 'user-2');

      expect(result).toBe(false);
    });

    it('should throw NotFoundException if business not found', async () => {
      businessRepository.findOne.mockResolvedValue(null);

      await expect(
        service.isOwnerOrMember('non-existent', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteMember', () => {
    it('should successfully invite a member', async () => {
      const mockInvite = {
        id: 'invite-1',
        email: 'newmember@test.com',
        status: BusinessMemberStatus.INVITED,
      };

      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(null);
      businessMemberRepository.create.mockReturnValue(mockInvite);
      businessMemberRepository.save.mockResolvedValue(mockInvite);
      userRepository.findOne.mockResolvedValue(mockUser);
      messagesService.createTeamInvitationMessage.mockResolvedValue({});

      const result = await service.inviteMember(
        'business-1',
        'owner-1',
        'newmember@test.com'
      );

      expect(result).toEqual(mockInvite);
      expect(businessMemberRepository.save).toHaveBeenCalled();
      expect(messagesService.createTeamInvitationMessage).toHaveBeenCalledWith(
        mockUser.id,
        'business-1',
        'invite-1',
        undefined
      );
    });

    it('should throw ForbiddenException if not the owner', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      await expect(
        service.inviteMember('business-1', 'not-owner', 'test@test.com')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if email not registered', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.inviteMember('business-1', 'owner-1', 'unknown@test.com')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if member already exists', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      userRepository.findOne.mockResolvedValue(mockUser);
      businessMemberRepository.findOne.mockResolvedValue({
        id: 'existing-member',
        status: BusinessMemberStatus.ACTIVE,
      });

      await expect(
        service.inviteMember('business-1', 'owner-1', 'existing@test.com')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if business not found', async () => {
      businessRepository.findOne.mockResolvedValue(null);

      await expect(
        service.inviteMember('non-existent', 'owner-1', 'test@test.com')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMembers', () => {
    it('should return members list for owner', async () => {
      const mockMembers = [
        { id: 'member-1', email: 'member1@test.com', status: BusinessMemberStatus.ACTIVE },
        { id: 'member-2', email: 'member2@test.com', status: BusinessMemberStatus.ACTIVE },
      ];

      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(null);
      businessMemberRepository.find.mockResolvedValue(mockMembers);

      const result = await service.listMembers('business-1', 'owner-1');

      expect(result).toEqual(mockMembers);
      expect(businessMemberRepository.find).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not owner or member', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listMembers('business-1', 'unauthorized-user')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should successfully remove a member', async () => {
      const mockMember = {
        id: 'member-1',
        email: 'member@test.com',
        status: BusinessMemberStatus.ACTIVE,
      };

      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(mockMember);
      businessMemberRepository.save.mockResolvedValue({
        ...mockMember,
        status: BusinessMemberStatus.REMOVED,
      });

      const result = await service.removeMember('business-1', 'owner-1', 'member-1');

      expect(result.status).toBe(BusinessMemberStatus.REMOVED);
      expect(businessMemberRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not the owner', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      await expect(
        service.removeMember('business-1', 'not-owner', 'member-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if member not found', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      businessMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember('business-1', 'owner-1', 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addContact', () => {
    it('should successfully add a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        email: 'contact@test.com',
        name: 'Test Contact',
      };

      businessContactRepository.create.mockReturnValue(mockContact);
      businessContactRepository.save.mockResolvedValue(mockContact);

      const result = await service.addContact('business-1', 'contact@test.com', 'Test Contact');

      expect(result).toEqual(mockContact);
      expect(businessContactRepository.create).toHaveBeenCalled();
      expect(businessContactRepository.save).toHaveBeenCalled();
    });
  });

  describe('listContacts', () => {
    it('should return contacts list', async () => {
      const mockContacts = [
        { id: 'contact-1', email: 'contact1@test.com' },
        { id: 'contact-2', email: 'contact2@test.com' },
      ];

      businessContactRepository.find.mockResolvedValue(mockContacts);

      const result = await service.listContacts('business-1');

      expect(result).toEqual(mockContacts);
      expect(businessContactRepository.find).toHaveBeenCalledWith({
        where: { business: { id: 'business-1' } },
      });
    });
  });

  describe('removeContact', () => {
    it('should successfully remove a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        email: 'contact@test.com',
      };

      businessContactRepository.findOne.mockResolvedValue(mockContact);
      businessContactRepository.delete.mockResolvedValue({});

      const result = await service.removeContact('business-1', 'contact-1');

      expect(result).toEqual({ success: true });
      expect(businessContactRepository.delete).toHaveBeenCalledWith('contact-1');
    });

    it('should throw NotFoundException if contact not found', async () => {
      businessContactRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeContact('business-1', 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listInvitesByEmail', () => {
    it('should return invites for user email', async () => {
      const mockInvites = [
        {
          id: 'invite-1',
          email: 'user@test.com',
          status: BusinessMemberStatus.INVITED,
          business: mockBusiness,
        },
      ];

      businessMemberRepository.find.mockResolvedValue(mockInvites);

      const result = await service.listInvitesByEmail('user@test.com');

      expect(result).toEqual(mockInvites);
      expect(businessMemberRepository.find).toHaveBeenCalledWith({
        where: { email: 'user@test.com', status: BusinessMemberStatus.INVITED },
        relations: ['business'],
      });
    });
  });
});
