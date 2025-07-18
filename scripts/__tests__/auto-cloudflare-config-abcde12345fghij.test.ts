/* eslint-disable */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  randomString,
  readConfig,
  writeConfig,
  detectFramework,
} from '../auto-cloudflare-config';

describe('auto-cloudflare-config typed API', () => {
  test('randomString enforces length and type', () => {
    const len: number = 6;
    const result = randomString(len);
    expect(result).toHaveLength(len);
    expect(/^[a-zA-Z0-9]+$/.test(result)).toBe(true);
    // @ts-expect-error length must be number
    expect(() => randomString('bad')).toThrow();
  });

  test('readConfig and writeConfig round trip json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-'));
    const file: string = path.join(dir, 'cfg.json');
    const data = { x: 1 };
    writeConfig(file, data);
    expect(readConfig(file)).toEqual(data);
    // @ts-expect-error file must be string
    // @ts-expect-error file must be string
    expect(readConfig(undefined)).toEqual({});
    // @ts-expect-error file must be string
    expect(() => writeConfig(null, {})).toThrow();
  });

  test('detectFramework returns known value', () => {
    const val = detectFramework();
    expect([null, 'next', 'vite', 'react']).toContain(val);
  });
});

