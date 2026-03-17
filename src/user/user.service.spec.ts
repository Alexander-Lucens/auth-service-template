import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { IUserRepository } from 'src/db/user/user.repository.interface';
import { CreateUserDto, UpdatePasswordDto, User } from './dto/user.dto';

jest.mock('src/crypto/hashPassword', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import { hashPassword, comparePassword } from 'src/crypto/hashPassword';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<IUserRepository>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'testuser@example.com',
    password: 'hashedpassword',
    roles: ['user'],
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    authMethods: [
      {
        provider: 'local',
        providerUserId: 'testuser@example.com',
        secret: 'hashedpassword',
      },
    ],
  };

  const mockRepository = {
    getAll: jest.fn(),
    getById: jest.fn(),
    getByEmail: jest.fn(),
    create: jest.fn(),
    linkAuthMethods: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: 'USER_REPOSITORY',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get('USER_REPOSITORY');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all users', async () => {
      repository.getAll.mockResolvedValue([mockUser]);

      const result = await service.getAll();

      expect(repository.getAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('getById', () => {
    it('should return user by id', async () => {
      repository.getById.mockResolvedValue(mockUser);

      const result = await service.getById(mockUser.id);

      expect(repository.getById).toHaveBeenCalledWith(mockUser.id);
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.getById.mockResolvedValue(undefined);

      await expect(service.getById(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      repository.getByEmail.mockResolvedValue(mockUser);

      const result = await service.getByEmail(mockUser.email);

      expect(repository.getByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a new local user', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      const hashedPassword = 'hashedpassword123';
      const newUser: User = {
        ...mockUser,
        email: createDto.email,
        password: hashedPassword,
      };

      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      repository.getByEmail.mockResolvedValue(undefined);
      repository.create.mockResolvedValue(newUser);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith({
        email: createDto.email,
        password: hashedPassword,
        authMethods: [
          {
            provider: 'local',
            providerUserId: createDto.email,
            secret: hashedPassword,
          },
        ],
      });
      expect(result.email).toBe(createDto.email);
    });

    it('should autolink oauth auth method to existing user by email', async () => {
      const createDto: CreateUserDto = {
        email: mockUser.email,
        authMethods: [
          {
            provider: 'google',
            providerUserId: 'google-123',
          },
        ],
      };

      const linkedUser: User = {
        ...mockUser,
        authMethods: [
          ...mockUser.authMethods,
          {
            provider: 'google',
            providerUserId: 'google-123',
          },
        ],
      };

      repository.getByEmail.mockResolvedValue(mockUser);
      repository.linkAuthMethods.mockResolvedValue(linkedUser);

      const result = await service.create(createDto);

      expect(repository.linkAuthMethods).toHaveBeenCalledWith(mockUser.id, [
        {
          provider: 'google',
          providerUserId: 'google-123',
          secret: undefined,
          metadata: undefined,
        },
      ]);
      expect(result.authMethods).toHaveLength(2);
    });

    it('should reject local signup when local auth already exists', async () => {
      const createDto: CreateUserDto = {
        email: mockUser.email,
        password: 'password123',
      };

      (hashPassword as jest.Mock).mockResolvedValue('hashedpassword123');
      repository.getByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update user password', async () => {
      const updateDto: UpdatePasswordDto = {
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      };

      const updatedUser: User = {
        ...mockUser,
        version: 2,
      };

      repository.getById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(updatedUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('hashednewpassword');

      const result = await service.update(mockUser.id, updateDto);

      expect(comparePassword).toHaveBeenCalledWith('oldpass', mockUser.password);
      expect(hashPassword).toHaveBeenCalledWith('newpass');
      expect(result.version).toBe(2);
    });
  });
});
