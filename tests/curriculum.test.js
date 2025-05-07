const request = require('supertest');
const express = require('express');
const curriculumRouter = require('../routes/curriculums');

const app = express();
app.use(express.json());
app.use('/api/curriculum', curriculumRouter);

// Mock middleware & model (disesuaikan)
jest.mock('../middlewares/accessValidation', () => (req, res, next) => next());
jest.mock('../middlewares/roleValidation', () => () => (req, res, next) => next());
jest.mock('../models', () => ({
  Curriculum: {
    findOne: jest.fn().mockResolvedValue({ name: 'K13', description: 'Kurtilas' }),
    findByPk: jest.fn().mockResolvedValue({
      update: jest.fn().mockResolvedValue(),
      id: 1,
      name: 'K13',
      description: 'Old'
    })
  }
}));

describe('settings section', () => {
  it('should return success if account data in a project is returned properly', async () => {
    const res = await request(app).get('/api/curriculum');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('K13');
  });

  it('should return success if account data in a project is edited successfully', async () => {
    const res = await request(app)
      .put('/api/curriculum/1')
      .send({ name: 'Kurmer', description: 'Kurikulum Merdeka' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });

  it('should return 400 if invalid ID is passed', async () => {
    const res = await request(app)
      .put('/api/curriculum/invalid')
      .send({ name: 'Kurmer' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid id/i);
  });
});
