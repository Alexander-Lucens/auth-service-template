import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { hashPassword } from '../../src/crypto/hashPassword';

describe('User (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    prisma = app.get(PrismaService);

    await app.init();

    await prisma.user.deleteMany({});

    const adminPasswordHash = await hashPassword('admin12345');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: adminPasswordHash,
        roles: ['admin'],
      },
    });
    adminUserId = adminUser.id;

    const userPasswordHash = await hashPassword('user12345');
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        password: userPasswordHash,
        roles: ['user'],
      },
    });
    userId = regularUser.id;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'admin12345' });
    adminToken = adminLoginResponse.body.accessToken;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'user12345' });
    userToken = userLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /user', () => {
    it('should reject unauthenticated user creation (401)', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'newuser@example.com', password: 'password123' })
        .expect(401);
    });

    it('should reject non-admin user creation (403)', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'newuser@example.com', password: 'password123' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should create a new user (admin only)', async () => {
      const response = await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'newuser@example.com', password: 'password123' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'newuser@example.com');
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('GET /user', () => {
    it('should return all users (admin only)', async () => {
      const response = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /user/:id', () => {
    it('should return user by id (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('PUT /user/:id/password', () => {
    it('should update own password (self-update)', async () => {
      await request(app.getHttpServer())
        .put(`/user/${userId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: 'user12345', newPassword: 'newpass12345' })
        .expect(200);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'newpass12345' })
        .expect(200);

      userToken = loginResponse.body.accessToken;
    });

    it('should return 403 for user trying to update other user password', async () => {
      await request(app.getHttpServer())
        .put(`/user/${adminUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: 'admin12345', newPassword: 'newpassword123' })
        .expect(403);
    });
  });

  describe('DELETE /user/:id', () => {
    it('should delete user (admin only)', async () => {
      const deleteUserPasswordHash = await hashPassword('password123');
      const deleteUser = await prisma.user.create({
        data: {
          email: 'todelete@example.com',
          password: deleteUserPasswordHash,
          roles: ['user'],
        },
      });

      await request(app.getHttpServer())
        .delete(`/user/${deleteUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
