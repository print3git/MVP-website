import { generateModel } from '../src/pipeline/generateModel';
import * as text from '../src/lib/textToImage';
import * as sparc from '../src/lib/sparc3dClient';
import * as s3 from '../src/lib/storeGlb';

describe('generateModel', () => {
  beforeEach(() => {
    jest.spyOn(console, 'time').mockImplementation(() => {});
    jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
    jest.spyOn(text, 'textToImage').mockResolvedValue('https://img');
    jest.spyOn(sparc, 'generateGlb').mockResolvedValue(Buffer.from('glb'));
    jest.spyOn(s3, 'storeGlb').mockResolvedValue('https://cdn/model.glb');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('generates image when missing and stores model', async () => {
    const url = await generateModel({ prompt: 'p' });
    expect(text.textToImage).toHaveBeenCalledWith('p');
    expect(sparc.generateGlb).toHaveBeenCalledWith({ prompt: 'p', imageURL: 'https://img' });
    expect(s3.storeGlb).toHaveBeenCalledWith(expect.any(Buffer));
    expect(url).toBe('https://cdn/model.glb');
  });

  test('uses provided imageURL', async () => {
    const url = await generateModel({ prompt: 'p', imageURL: 'http://img' });
    expect(text.textToImage).not.toHaveBeenCalled();
    expect(sparc.generateGlb).toHaveBeenCalledWith({ prompt: 'p', imageURL: 'http://img' });
    expect(s3.storeGlb).toHaveBeenCalledWith(expect.any(Buffer));
    expect(url).toBe('https://cdn/model.glb');
  });
});
