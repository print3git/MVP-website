process.env.HUNYUAN_API_KEY = 'test';

jest.mock('axios');
const axios = require('axios');

jest.mock('obj2gltf');
const obj2gltf = require('obj2gltf');

jest.mock('fs');
const fs = require('fs');

jest.mock('uuid', () => ({ v4: jest.fn() }));
const { v4: uuidv4 } = require('uuid');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  axios.post.mockResolvedValue({ data: { obj_url: 'http://example.com/model.obj' } });
  axios.get.mockResolvedValue({ data: Buffer.from('obj-data') });
  obj2gltf.mockResolvedValue({});
  fs.promises = { mkdir: jest.fn().mockResolvedValue() };
  fs.writeFileSync = jest.fn();
  uuidv4.mockReset();
  uuidv4.mockReturnValueOnce('obj-uuid').mockReturnValueOnce('glb-uuid');
});

test('POST /generate returns glb url', async () => {
  const res = await request(app).post('/generate').field('prompt', 'hello');
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe('/models/glb-uuid.glb');
});
