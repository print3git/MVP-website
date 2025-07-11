jest.mock('../src/lib/textToImage.js', () => ({ textToImage: jest.fn() }));
jest.mock('../src/lib/imageToText.js', () => ({ imageToText: jest.fn() }));
jest.mock('../src/lib/prepareImage.js', () => ({ prepareImage: jest.fn() }));
jest.mock('../src/lib/sparc3dClient.js', () => ({ generateGlb: jest.fn() }));
jest.mock('../src/lib/storeGlb.js', () => ({ storeGlb: jest.fn() }));

const { generateModel } = require('../src/pipeline/generateModel.js');
const text = require('../src/lib/textToImage.js');
const img2text = require('../src/lib/imageToText.js');
const prep = require('../src/lib/prepareImage.js');
const sparc = require('../src/lib/sparc3dClient.js');
const s3 = require('../src/lib/storeGlb.js');
const fs = require('fs');
const path = require('path');

describe('generateModel', () => {
  const fixture = path.join(__dirname, 'tmp.png');

  beforeAll(() => {
    fs.writeFileSync(fixture, Buffer.from('hi'));
  });

  afterAll(() => {
    fs.unlinkSync(fixture);
  });

  beforeEach(() => {
    process.env.STABILITY_KEY = 'key';
    process.env.SPARC3D_TOKEN = 'token';
    process.env.AWS_REGION = 'us-east-1';
    jest.spyOn(console, 'time').mockImplementation(() => {});
    jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
    text.textToImage.mockResolvedValue('https://img');
    img2text.imageToText.mockResolvedValue('prompt');
    prep.prepareImage.mockResolvedValue('https://img');
    sparc.generateGlb.mockResolvedValue(Buffer.from('glb'));
    s3.storeGlb.mockResolvedValue('https://cdn/model.glb');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('generates image when missing and stores model', async () => {
    const url = await generateModel({ prompt: 'p' });
    expect(text.textToImage).toHaveBeenCalledWith('p');
    expect(prep.prepareImage).not.toHaveBeenCalled();
    expect(img2text.imageToText).not.toHaveBeenCalled();
    expect(sparc.generateGlb).toHaveBeenCalledWith({ prompt: 'p', imageURL: 'https://img' });
    expect(s3.storeGlb).toHaveBeenCalledWith(expect.any(Buffer));
    expect(url).toBe('https://cdn/model.glb');
  });

  test('uses provided image URL with prompt', async () => {
    const url = await generateModel({ prompt: 'p', image: 'http://img' });
    expect(text.textToImage).not.toHaveBeenCalled();
    expect(prep.prepareImage).toHaveBeenCalledWith('http://img');
    expect(sparc.generateGlb).toHaveBeenCalledWith({ prompt: 'p', imageURL: 'https://img' });
    expect(s3.storeGlb).toHaveBeenCalledWith(expect.any(Buffer));
    expect(url).toBe('https://cdn/model.glb');
  });

  test('image only generates prompt', async () => {
    const url = await generateModel({ image: fixture });
    expect(prep.prepareImage).toHaveBeenCalledWith(fixture);
    expect(img2text.imageToText).toHaveBeenCalledWith('https://img');
    expect(text.textToImage).not.toHaveBeenCalled();
    expect(sparc.generateGlb).toHaveBeenCalledWith({ prompt: 'prompt', imageURL: 'https://img' });
    expect(s3.storeGlb).toHaveBeenCalledWith(expect.any(Buffer));
    expect(url).toBe('https://cdn/model.glb');
  });
});
