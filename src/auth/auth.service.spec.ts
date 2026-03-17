import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { CreateUserDto, User } from 'src/user/dto/user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

jest.mock('src/crypto/hashPassword', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import { comparePassword } from 'src/crypto/hashPassword';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

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

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockUserService = {
    create: jest.fn(),
    getByEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        JWT_SECRET_KEY: 'test-secret',
        JWT_SECRET_REFRESH_KEY: 'test-refresh-secret',
        TOKEN_EXPIRE_TIME: '1h',
        TOKEN_REFRESH_EXPIRE_TIME: '24h',
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET_KEY: 'test-secret',
        JWT_SECRET_REFRESH_KEY: 'test-refresh-secret',
      };
      const value = config[key];
      if (!value) throw new Error(`Config key ${key} not found`);
      return value;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
      };
      const createdUser = { id: '1', email: createDto.email };
      userService.create.mockResolvedValue(createdUser as any);

      const result = await service.signup(createDto);

      expect(userService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'testuser@example.com',
        password: 'password123',
      };

      userService.getByEmail.mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.login(loginDto);

      expect(userService.getByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ForbiddenException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'testuser@example.com',
        password: 'wrongpassword',
      };

      userService.getByEmail.mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const payload = { userId: mockUser.id, email: mockUser.email };
      jwtService.verifyAsync.mockResolvedValue(payload);
      userService.getByEmail.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refresh(refreshDto);

      expect(userService.getByEmail).toHaveBeenCalledWith(payload.email);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const refreshDto: RefreshDto = { refreshToken: '' };

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
