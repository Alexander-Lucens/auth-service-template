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
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany({});

    // Create admin user
    const adminPasswordHash = await hashPassword('admin123');
    const adminUser = await prisma.user.create({
      data: {
        login: 'admin',
        password: adminPasswordHash,
        roles: ['admin'],
      },
    });
    adminUserId = adminUser.id;

    // Create regular user
    const userPasswordHash = await hashPassword('user123');
    const regularUser = await prisma.user.create({
      data: {
        login: 'user',
        password: userPasswordHash,
        roles: ['user'],
      },
    });
    userId = regularUser.id;

    // Login as admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'admin', password: 'admin123' });
    adminToken = adminLoginResponse.body.accessToken;

    // Login as user
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'user', password: 'user123' });
    userToken = userLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /user', () => {
    it('should create a new user (public endpoint)', async () => {
      const createDto = {
        login: 'newuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('login', createDto.login);
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

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/user').expect(401);
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

    it('should return user by id (user can see themselves)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app.getHttpServer())
        .get(`/user/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /user/:id/password', () => {
    it('should update password (admin)', async () => {
      const updateDto = {
        oldPassword: 'user123',
        newPassword: 'newpassword123',
      };

      await request(app.getHttpServer())
        .put(`/user/${userId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      // Verify password was changed
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'user', password: 'newpassword123' })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
    });

    it('should return 403 for non-admin trying to update other user', async () => {
      const updateDto = {
        oldPassword: 'admin123',
        newPassword: 'newpassword123',
      };

      await request(app.getHttpServer())
        .put(`/user/${adminUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /user/:id', () => {
    it('should delete user (admin only)', async () => {
      // Create a user to delete
      const deleteUserPasswordHash = await hashPassword('password123');
      const deleteUser = await prisma.user.create({
        data: {
          login: 'todelete',
          password: deleteUserPasswordHash,
          roles: ['user'],
        },
      });

      await request(app.getHttpServer())
        .delete(`/user/${deleteUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify user was deleted
      await request(app.getHttpServer())
        .get(`/user/${deleteUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .delete(`/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
