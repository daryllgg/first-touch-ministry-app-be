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

describe('AnnouncementsController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let normalToken: string;
  let createdAnnouncementId: string;

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
    await ds.query('TRUNCATE TABLE announcements CASCADE');
    await ds.query('TRUNCATE TABLE users CASCADE');

    // Create an admin user with ADMIN + PASTOR roles directly in DB
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const adminRole = await roleRepo.findOne({ where: { name: RoleName.ADMIN } });
    const pastorRole = await roleRepo.findOne({ where: { name: RoleName.PASTOR } });
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

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@church.com', password: 'Admin123!' });
    adminToken = loginRes.body.accessToken;

    // Register a normal user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'normal@church.com',
        password: 'Password123!',
        firstName: 'Normal',
        lastName: 'User',
      });

    // Approve the normal user via direct DB update
    await ds.query(`UPDATE users SET "isApproved" = true WHERE email = 'normal@church.com'`);

    // Login as normal user
    const normalLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'normal@church.com', password: 'Password123!' });
    normalToken = normalLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /announcements', () => {
    it('should allow admin/pastor to create an announcement', async () => {
      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Sunday Service', content: 'Join us this Sunday at 10am.' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Sunday Service');
      expect(res.body.content).toBe('Join us this Sunday at 10am.');
      expect(res.body.author).toBeDefined();
      expect(res.body.author.email).toBe('admin@church.com');
      // passwordHash should be excluded by ClassSerializerInterceptor
      expect(res.body.author.passwordHash).toBeUndefined();

      createdAnnouncementId = res.body.id;
    });

    it('should reject creation by normal user (403)', async () => {
      return request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ title: 'Unauthorized', content: 'Should not work.' })
        .expect(403);
    });

    it('should reject unauthenticated request (401)', () => {
      return request(app.getHttpServer())
        .post('/announcements')
        .send({ title: 'No Auth', content: 'Should fail.' })
        .expect(401);
    });
  });

  describe('GET /announcements', () => {
    it('should return list of announcements for approved user', async () => {
      const res = await request(app.getHttpServer())
        .get('/announcements')
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('content');
      expect(res.body[0]).toHaveProperty('author');
    });

    it('should reject unauthenticated request (401)', () => {
      return request(app.getHttpServer())
        .get('/announcements')
        .expect(401);
    });
  });

  describe('GET /announcements/:id', () => {
    it('should return a single announcement', async () => {
      const res = await request(app.getHttpServer())
        .get(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdAnnouncementId);
      expect(res.body.title).toBe('Sunday Service');
      expect(res.body.content).toBe('Join us this Sunday at 10am.');
    });

    it('should return 404 for non-existent announcement', () => {
      return request(app.getHttpServer())
        .get('/announcements/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(404);
    });
  });

  describe('PATCH /announcements/:id', () => {
    it('should update an announcement', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Sunday Service' })
        .expect(200);

      expect(res.body.title).toBe('Updated Sunday Service');
      expect(res.body.content).toBe('Join us this Sunday at 10am.');
    });

    it('should reject update by normal user (403)', () => {
      return request(app.getHttpServer())
        .patch(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });
  });

  describe('DELETE /announcements/:id', () => {
    it('should reject delete by normal user (403)', () => {
      return request(app.getHttpServer())
        .delete(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', `Bearer ${normalToken}`)
        .expect(403);
    });

    it('should allow admin to delete an announcement', async () => {
      await request(app.getHttpServer())
        .delete(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject unauthenticated request (401)', () => {
      return request(app.getHttpServer())
        .delete(`/announcements/${createdAnnouncementId}`)
        .expect(401);
    });
  });
});
