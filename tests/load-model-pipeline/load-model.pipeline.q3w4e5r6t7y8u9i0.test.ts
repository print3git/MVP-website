/** @jest-environment jsdom */
import { loadModel } from '../../src/js/loadModel.js';

describe('loadModel pipeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="viewer" style="width:100px;height:100px"></div>';
    (window as any).__viewer = undefined;
    (window as any).__viewerFrames = undefined;
  });

  test('throws if container missing', async () => {
    await expect(loadModel('ok.glb', 'missing')).rejects.toThrow(/Container/);
  });

  test('appends canvas with role img', async () => {
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('role')).toBe('img');
  });

  test('sets aria-label on canvas', async () => {
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas');
    expect(canvas?.getAttribute('aria-label')).toBe('3D model preview');
  });

  test('exposes viewer object', async () => {
    await loadModel('ok.glb', 'viewer');
    expect((window as any).__viewer).toBeDefined();
  });

  test('records at least one rendered frame', async () => {
    await loadModel('ok.glb', 'viewer');
    expect((window as any).__viewerFrames).toBeGreaterThan(0);
  });

  test('uses container dimensions', async () => {
    const container = document.getElementById('viewer')! as any;
    Object.defineProperty(container, 'clientWidth', { value: 500 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(500);
    expect(canvas.height).toBe(400);
  });

  test('handles GLTF load failure', async () => {
    await loadModel('fail.glb', 'viewer');
    expect(document.getElementById('viewer')?.textContent).toMatch(/model not available/i);
  });

  test('does not expose viewer on failure', async () => {
    await loadModel('fail.glb', 'viewer');
    expect((window as any).__viewer).toBeUndefined();
  });

  test('frame counter not set on failure', async () => {
    await loadModel('fail.glb', 'viewer');
    expect((window as any).__viewerFrames).toBeUndefined();
  });

  test('canvas present after successful load', async () => {
    await loadModel('ok.glb', 'viewer');
    expect(document.querySelector('#viewer canvas')).not.toBeNull();
  });
});
