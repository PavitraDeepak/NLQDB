import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/index.js';

let authToken;
let testUser;

beforeAll(async () => {
  // Create test user
  testUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'analyst'
  });
});

afterAll(async () => {
  await User.deleteMany({ email: 'test@example.com' });
  await mongoose.connection.close();
});

describe('Auth API', () => {
  test('POST /api/auth/login - success', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data.user.email).toBe('test@example.com');
    
    authToken = response.body.data.token;
  });

  test('POST /api/auth/login - invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/auth/profile - authenticated', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });

  test('GET /api/auth/profile - unauthenticated', async () => {
    const response = await request(app)
      .get('/api/auth/profile');

    expect(response.status).toBe(401);
  });
});

describe('Query API', () => {
  test('POST /api/translate - requires authentication', async () => {
    const response = await request(app)
      .post('/api/translate')
      .send({ userQuery: 'Show customers' });

    expect(response.status).toBe(401);
  });

  test('POST /api/translate - validation error', async () => {
    const response = await request(app)
      .post('/api/translate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
  });
});

describe('Schema API', () => {
  test('GET /api/schema - authenticated', async () => {
    const response = await request(app)
      .get('/api/schema')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  test('GET /api/tables - list collections', async () => {
    const response = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
