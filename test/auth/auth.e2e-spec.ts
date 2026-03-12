import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { hashPassword } from '../../src/crypto/hashPassword';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user', async () => {
      const signupDto = {
        login: 'testuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('login', signupDto.login);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('roles', ['user']);
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          login: 'ab', // Too short
          password: '12', // Too short
        })
        .expect(400);
    });

    it('should return 400 for duplicate login', async () => {
      const signupDto = {
        login: 'testuser',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('password123');
      await prisma.user.create({
        data: {
          login: 'testuser',
          password: passwordHash,
          roles: ['user'],
        },
      });
    });

    it('should return tokens for valid credentials', async () => {
      const loginDto = {
        login: 'testuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      authToken = response.body.accessToken;
    });

    it('should return 403 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'wrongpassword',
        })
        .expect(403);
    });

    it('should return 403 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'nonexistent',
          password: 'password123',
        })
        .expect(403);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('password123');
      await prisma.user.create({
        data: {
          login: 'testuser',
          password: passwordHash,
          roles: ['user'],
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'testuser',
          password: 'password123',
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should return new tokens for valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 403 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);
    });
  });
});
