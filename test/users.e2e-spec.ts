import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/users/entities/role.entity';
import { RoleName } from '../src/users/entities/role.enum';
import * as bcrypt from 'bcrypt';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    // Clean up
    const ds = app.get(DataSource);
    await ds.query('TRUNCATE TABLE users CASCADE');

    // Create an admin user directly in DB for testing
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const adminRole = await roleRepo.findOne({ where: { name: RoleName.ADMIN } });
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const admin = userRepo.create({
      email: 'admin@church.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isApproved: true,
      roles: [adminRole],
    });
    await userRepo.save(admin);

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@church.com', password: 'Admin123!' });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/pending', () => {
    it('should return pending users for admin', async () => {
      // Register a pending user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'pending@church.com',
          password: 'Password123!',
          firstName: 'Pending',
          lastName: 'User',
        });

      return request(app.getHttpServer())
        .get('/users/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThanOrEqual(1);
          expect(res.body.some((u: any) => u.email === 'pending@church.com')).toBe(true);
        });
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/users/pending')
        .expect(401);
    });
  });

  describe('PATCH /users/:id/approve', () => {
    it('should approve a pending user', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'toapprove@church.com',
          password: 'Password123!',
          firstName: 'To',
          lastName: 'Approve',
        });

      return request(app.getHttpServer())
        .patch(`/users/${regRes.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isApproved).toBe(true);
        });
    });
  });

  describe('POST /users/:id/roles', () => {
    it('should assign a role to a user', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'roleuser@church.com',
          password: 'Password123!',
          firstName: 'Role',
          lastName: 'User',
        });

      return request(app.getHttpServer())
        .post(`/users/${regRes.body.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'WORSHIP_LEADER' })
        .expect(200)
        .expect((res) => {
          expect(res.body.roles.some((r: any) => r.name === 'WORSHIP_LEADER')).toBe(true);
        });
    });
  });
});
