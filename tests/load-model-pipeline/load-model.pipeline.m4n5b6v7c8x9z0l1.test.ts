/** @jest-environment jsdom */
import { loadModel } from '../../src/js/loadModel.js';

describe('loadModel diagnostics', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="viewer" style="width:100px;height:80px"></div>';
    (window as any).__viewer = undefined;
    (window as any).__viewerFrames = undefined;
  });

  test('records rendered frames on success', async () => {
    await loadModel('ok.glb', 'viewer');
    expect((window as any).__viewerFrames).toBeGreaterThan(0);
  });

  test('exposes viewer object', async () => {
    await loadModel('ok.glb', 'viewer');
    expect((window as any).__viewer).toBeDefined();
  });

  test('canvas has accessible attributes', async () => {
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe('3D model preview');
  });

  test('uses default size when container has no dimensions', async () => {
    const el = document.getElementById('viewer') as HTMLElement;
    el.style.width = '0px';
    el.style.height = '0px';
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(300);
  });

  test('handles GLTF load failure with message', async () => {
    await loadModel('fail.glb', 'viewer');
    expect(document.getElementById('viewer')?.textContent).toMatch(/model not available/i);
  });

  test('throws if container missing', async () => {
    await expect(loadModel('ok.glb', 'missing')).rejects.toThrow(/Container/);
  });
});
