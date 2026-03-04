import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    // Clean up test data
    const dataSource = app.get(DataSource);
    await dataSource.query('TRUNCATE TABLE users CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@church.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe('test@church.com');
          expect(res.body.isApproved).toBe(false);
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@church.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe',
        });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@church.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe',
        })
        .expect(409);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login-test@church.com',
          password: 'Password123!',
          firstName: 'Login',
          lastName: 'Test',
        });
    });

    it('should return JWT token on valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login-test@church.com', password: 'Password123!' })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe('login-test@church.com');
          expect(res.body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login-test@church.com', password: 'WrongPassword!' })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'noone@church.com', password: 'Password123!' })
        .expect(401);
    });
  });
});
