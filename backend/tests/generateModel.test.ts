import { generateModel } from '../src/pipeline/generateModel';
import * as text from '../src/lib/textToImage';
import * as img2text from '../src/lib/imageToText';
import * as prep from '../src/lib/prepareImage';
import * as sparc from '../src/lib/sparc3dClient';
import * as s3 from '../src/lib/storeGlb';
import fs from 'fs';
import path from 'path';

describe('generateModel', () => {
  const fixture = path.join(__dirname, 'tmp.png');

  beforeAll(() => {
    fs.writeFileSync(fixture, Buffer.from('hi'));
  });

  afterAll(() => {
    fs.unlinkSync(fixture);
  });

  beforeEach(() => {
    jest.spyOn(console, 'time').mockImplementation(() => {});
    jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
    jest.spyOn(text, 'textToImage').mockResolvedValue('https://img');
    jest.spyOn(img2text, 'imageToText').mockResolvedValue('prompt');
    jest.spyOn(prep, 'prepareImage').mockResolvedValue('https://img');
    jest.spyOn(sparc, 'generateGlb').mockResolvedValue(Buffer.from('glb'));
    jest.spyOn(s3, 'storeGlb').mockResolvedValue('https://cdn/model.glb');
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
