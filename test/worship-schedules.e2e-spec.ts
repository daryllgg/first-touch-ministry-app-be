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

describe('WorshipSchedulesController (e2e)', () => {
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
    await ds.query('TRUNCATE TABLE worship_schedules, users CASCADE');

    // Create an admin user with ADMIN + WORSHIP_LEADER roles
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const adminRole = await roleRepo.findOne({ where: { name: RoleName.ADMIN } });
    const worshipLeaderRole = await roleRepo.findOne({ where: { name: RoleName.WORSHIP_LEADER } });
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const admin = userRepo.create({
      email: 'admin@church.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isApproved: true,
      roles: [adminRole!, worshipLeaderRole!],
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

  describe('POST /worship-schedules', () => {
    it('should create a worship schedule', () => {
      return request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sunday Worship',
          description: 'Main Sunday service',
          scheduledDate: '2030-06-15T09:00:00Z',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe('Sunday Worship');
          expect(res.body.description).toBe('Main Sunday service');
          expect(res.body.scheduledDate).toBeDefined();
          expect(res.body.id).toBeDefined();
          expect(res.body.createdBy).toBeDefined();
          expect(res.body.createdBy.email).toBe('admin@church.com');
          expect(res.body.createdBy).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject invalid data', () => {
      return request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          scheduledDate: 'not-a-date',
        })
        .expect(400);
    });
  });

  describe('GET /worship-schedules', () => {
    it('should return all worship schedules ordered by date ASC', async () => {
      // Clean schedules first
      const ds = app.get(DataSource);
      await ds.query('TRUNCATE TABLE worship_schedules CASCADE');

      // Create schedules with different dates
      await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Later Service',
          scheduledDate: '2030-12-25T09:00:00Z',
        });

      await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Earlier Service',
          scheduledDate: '2030-06-01T09:00:00Z',
        });

      return request(app.getHttpServer())
        .get('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(2);
          expect(res.body[0].title).toBe('Earlier Service');
          expect(res.body[1].title).toBe('Later Service');
        });
    });
  });

  describe('GET /worship-schedules/upcoming', () => {
    it('should return only future-dated schedules', async () => {
      // Clean schedules first
      const ds = app.get(DataSource);
      await ds.query('TRUNCATE TABLE worship_schedules CASCADE');

      // Create a past schedule
      await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Past Service',
          scheduledDate: '2020-01-01T00:00:00Z',
        });

      // Create a future schedule
      await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Future Service',
          scheduledDate: '2030-12-31T00:00:00Z',
        });

      return request(app.getHttpServer())
        .get('/worship-schedules/upcoming')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(1);
          expect(res.body[0].title).toBe('Future Service');
        });
    });
  });

  describe('GET /worship-schedules/:id', () => {
    it('should return a single worship schedule', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Midweek Service',
          scheduledDate: '2030-07-10T19:00:00Z',
        });

      return request(app.getHttpServer())
        .get(`/worship-schedules/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Midweek Service');
          expect(res.body.id).toBe(createRes.body.id);
        });
    });

    it('should return 404 for non-existent schedule', () => {
      return request(app.getHttpServer())
        .get('/worship-schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /worship-schedules/:id', () => {
    it('should update a worship schedule', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Title',
          scheduledDate: '2030-08-01T09:00:00Z',
        });

      return request(app.getHttpServer())
        .patch(`/worship-schedules/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          description: 'Added description',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Title');
          expect(res.body.description).toBe('Added description');
        });
    });
  });

  describe('DELETE /worship-schedules/:id', () => {
    it('should delete a worship schedule', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/worship-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'To Delete',
          scheduledDate: '2030-09-01T09:00:00Z',
        });

      await request(app.getHttpServer())
        .delete(`/worship-schedules/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's deleted
      return request(app.getHttpServer())
        .get(`/worship-schedules/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 for unauthenticated GET request', () => {
      return request(app.getHttpServer())
        .get('/worship-schedules')
        .expect(401);
    });

    it('should return 401 for unauthenticated POST request', () => {
      return request(app.getHttpServer())
        .post('/worship-schedules')
        .send({
          title: 'Unauthorized',
          scheduledDate: '2030-06-15T09:00:00Z',
        })
        .expect(401);
    });
  });
});
