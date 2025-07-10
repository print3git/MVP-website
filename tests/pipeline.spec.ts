import 'dotenv/config';
import request from 'supertest';
import fetch from 'node-fetch';
import http from 'http';

jest.mock('../backend/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  };
});

const generateModel = jest.fn();
jest.mock('../backend/src/pipeline/generateModel', () => ({
  generateModel: (...args: any[]) => generateModel(...args),
}));

const app = require('../backend/server');

const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

describe('pipeline integration', () => {
  let glbServer: http.Server;
  let glbUrl: string;

  beforeAll((done) => {
    glbServer = http.createServer((req, res) => {
      res.statusCode = 200;
      res.end();
    });
    glbServer.listen(0, () => {
      const { port } = glbServer.address() as any;
      glbUrl = `http://localhost:${port}/model.glb`;
      done();
    });
  });

  afterAll(() => {
    glbServer.close();
  });

  beforeEach(() => {
    generateModel.mockResolvedValue(glbUrl);
  });

  test('Health endpoint returns 200', async () => {
    console.log('→ GET /api/health');
    const res = await request(app).get('/api/health');
    console.log('← status', res.status);
    expect(res.status).toBe(200);
  });

  async function postGenerate(data: any) {
    console.log('→ POST /api/generate', data);
    let req = request(app).post('/api/generate');
    if (data.prompt) req = req.field('prompt', data.prompt);
    if (data.image) req = req.attach('image', Buffer.from('test'), 'image.png');
    const res = await req;
    console.log('← status', res.status, 'body', res.body);
    expect(res.status).toBe(200);
    expect(res.body.glb_url).toBe(glbUrl);
    expect(res.body.glb_url).not.toBe(FALLBACK_GLB);
    const head = await fetch(res.body.glb_url, { method: 'HEAD' });
    console.log('HEAD', head.status);
    expect(head.status).toBe(200);
  }

  test('text prompt only', async () => {
    await postGenerate({ prompt: 'cat' });
  });

  test('image only', async () => {
    await postGenerate({ image: true });
  });

  test('text and image', async () => {
    await postGenerate({ prompt: 'cat', image: true });
  });
});
