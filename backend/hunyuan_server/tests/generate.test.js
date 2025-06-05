process.env.HUNYUAN_API_KEY = 'test';

jest.mock('axios');
const axios = require('axios');

jest.mock('obj2gltf', () => jest.fn(), { virtual: true });
const obj2gltf = require('obj2gltf');

jest.mock('fs');
const fs = require('fs');

jest.mock('uuid', () => ({ v4: jest.fn() }));
const { v4: uuidv4 } = require('uuid');

const request = require('supertest');

fs.promises = {
  mkdir: jest.fn().mockResolvedValue(),
  unlink: jest.fn().mockResolvedValue(),
};
fs.writeFileSync = jest.fn();

const app = require('../server');

beforeEach(() => {
  axios.post.mockResolvedValue({
    data: { obj_url: 'http://example.com/model.obj' },
  });
  axios.get.mockResolvedValue({ data: Buffer.from('obj-data') });
  obj2gltf.mockResolvedValue({});
  uuidv4.mockReset();
  uuidv4.mockReturnValueOnce('obj-uuid').mockReturnValueOnce('glb-uuid');
});

test('POST /generate returns glb url', async () => {
  const res = await request(app).post('/generate').field('prompt', 'hello');
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe('/models/glb-uuid.glb');
});

test('POST /generate requires prompt', async () => {
  const res = await request(app).post('/generate').field('prompt', '');
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('prompt required');
});

test('POST /generate handles generation failure', async () => {
  axios.post.mockRejectedValueOnce(new Error('fail'));
  const res = await request(app).post('/generate').field('prompt', 'bad');
  expect(res.status).toBe(500);
  expect(res.body.error).toBe('generation failed');
});
