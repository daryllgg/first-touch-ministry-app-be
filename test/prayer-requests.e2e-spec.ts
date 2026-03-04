import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/users/entities/role.entity';
import { RoleName } from '../src/users/entities/role.enum';
import { PrayerRequestVisibility } from '../src/prayer-requests/entities/prayer-request-visibility.enum';
import * as bcrypt from 'bcrypt';

describe('PrayerRequestsController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let normalToken: string;
  let normalUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    // Clean up
    const ds = app.get(DataSource);
    await ds.query('TRUNCATE TABLE prayer_requests CASCADE');
    await ds.query('TRUNCATE TABLE users CASCADE');

    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);

    // Create admin user with ADMIN + PASTOR roles
    const adminRole = await roleRepo.findOne({
      where: { name: RoleName.ADMIN },
    });
    const pastorRole = await roleRepo.findOne({
      where: { name: RoleName.PASTOR },
    });
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const admin = userRepo.create({
      email: 'admin@church.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isApproved: true,
      roles: [adminRole!, pastorRole!],
    });
    await userRepo.save(admin);

    // Create normal approved user
    const normalPasswordHash = await bcrypt.hash('Normal123!', 10);
    const normalUser = userRepo.create({
      email: 'normal@church.com',
      passwordHash: normalPasswordHash,
      firstName: 'Normal',
      lastName: 'User',
      isApproved: true,
      roles: [],
    });
    const savedNormal = await userRepo.save(normalUser);
    normalUserId = savedNormal.id;

    // Login as admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@church.com', password: 'Admin123!' });
    adminToken = adminLoginRes.body.accessToken;

    // Login as normal user
    const normalLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'normal@church.com', password: 'Normal123!' });
    normalToken = normalLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /prayer-requests', () => {
    it('should create a public prayer request (default visibility)', async () => {
      const res = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ content: 'Please pray for my family' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.content).toBe('Please pray for my family');
      expect(res.body.visibility).toBe(PrayerRequestVisibility.PUBLIC);
      expect(res.body.author).toBeDefined();
      expect(res.body.author.email).toBe('normal@church.com');
      // passwordHash should be excluded
      expect(res.body.author.passwordHash).toBeUndefined();
    });

    it('should create a private prayer request', async () => {
      const res = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({
          content: 'Private prayer need',
          visibility: PrayerRequestVisibility.PRIVATE,
        })
        .expect(201);

      expect(res.body.content).toBe('Private prayer need');
      expect(res.body.visibility).toBe(PrayerRequestVisibility.PRIVATE);
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .post('/prayer-requests')
        .send({ content: 'Test prayer' })
        .expect(401);
    });
  });

  describe('GET /prayer-requests', () => {
    let adminPrivatePrId: string;

    beforeAll(async () => {
      // Create additional prayer requests for visibility testing
      // Admin creates a private prayer request
      const res = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Admin private prayer',
          visibility: PrayerRequestVisibility.PRIVATE,
        });
      adminPrivatePrId = res.body.id;

      // Admin creates a public prayer request
      await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Admin public prayer' });
    });

    it('should return ALL prayer requests for admin/pastor', async () => {
      const res = await request(app.getHttpServer())
        .get('/prayer-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Admin should see all requests including others' private ones
      const contents = res.body.map((pr: any) => pr.content);
      expect(contents).toContain('Admin private prayer');
      expect(contents).toContain('Admin public prayer');
      expect(contents).toContain('Private prayer need');
      expect(contents).toContain('Please pray for my family');
    });

    it('should return only PUBLIC + own PRIVATE for normal user', async () => {
      const res = await request(app.getHttpServer())
        .get('/prayer-requests')
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      const contents = res.body.map((pr: any) => pr.content);
      // Normal user should see public requests
      expect(contents).toContain('Please pray for my family');
      expect(contents).toContain('Admin public prayer');
      // Normal user should see their own private requests
      expect(contents).toContain('Private prayer need');
      // Normal user should NOT see admin's private request
      expect(contents).not.toContain('Admin private prayer');
    });

    it('should return results ordered by createdAt DESC', async () => {
      const res = await request(app.getHttpServer())
        .get('/prayer-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (let i = 1; i < res.body.length; i++) {
        const prev = new Date(res.body[i - 1].createdAt).getTime();
        const curr = new Date(res.body[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/prayer-requests')
        .expect(401);
    });
  });

  describe('DELETE /prayer-requests/:id', () => {
    let normalPrId: string;
    let adminPrId: string;

    beforeAll(async () => {
      // Create a prayer request by normal user for deletion tests
      const normalRes = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ content: 'To be deleted by author' });
      normalPrId = normalRes.body.id;

      // Create a prayer request by admin for deletion tests
      const adminRes = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Admin request to delete' });
      adminPrId = adminRes.body.id;
    });

    it('should allow author to delete own prayer request', async () => {
      await request(app.getHttpServer())
        .delete(`/prayer-requests/${normalPrId}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(200);
    });

    it('should allow admin to delete any prayer request', async () => {
      // Create another normal user prayer request
      const res = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ content: 'Normal user request for admin to delete' });

      await request(app.getHttpServer())
        .delete(`/prayer-requests/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should forbid normal user from deleting others prayer request', async () => {
      await request(app.getHttpServer())
        .delete(`/prayer-requests/${adminPrId}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(403);
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .delete(`/prayer-requests/${adminPrId}`)
        .expect(401);
    });
  });
});
