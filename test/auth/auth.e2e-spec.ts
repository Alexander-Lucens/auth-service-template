import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { hashPassword } from '../../src/crypto/hashPassword';
import { ThrottlerModule } from '@nestjs/throttler';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ThrottlerModule)
      .useModule(ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new local user', async () => {
      const signupDto = {
        email: 'testuser@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', signupDto.email);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('roles', ['user']);
      expect(response.body).toHaveProperty('authMethods');
    });

    it('should autolink oauth method for existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'testuser@example.com', password: 'password123' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'testuser@example.com',
          authMethods: [
            {
              provider: 'google',
              providerUserId: 'google-123',
            },
          ],
        })
        .expect(201);

      expect(response.body.authMethods).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provider: 'google',
            providerUserId: 'google-123',
          }),
        ]),
      );
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: '12',
        })
        .expect(400);
    });

    it('should return 400 for duplicate local signup by same email', async () => {
      const signupDto = {
        email: 'testuser@example.com',
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
          email: 'testuser@example.com',
          password: passwordHash,
          roles: ['user'],
        },
      });
    });

    it('should return tokens for valid credentials', async () => {
      const loginDto = {
        email: 'testuser@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 403 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'wrongpassword',
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
          email: 'testuser@example.com',
          password: passwordHash,
          roles: ['user'],
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
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
  });
});
