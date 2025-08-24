/** @jest-environment jsdom */
import { loadModel } from '../../src/js/loadModel.js';

describe('loadModel diagnostics', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="viewer" style="width:100px;height:100px"></div>';
    (window as any).__viewer = undefined;
    (window as any).__viewerFrames = undefined;
  });

  test('throws when container is missing', async () => {
    await expect(loadModel('ok.glb', 'nope')).rejects.toThrow(/Container/);
  });

  test('creates a canvas with role img', async () => {
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('role')).toBe('img');
  });

  test('applies aria-label to canvas', async () => {
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas');
    expect(canvas?.getAttribute('aria-label')).toBe('3D model preview');
  });

  test('exposes viewer with renderer and scene', async () => {
    await loadModel('ok.glb', 'viewer');
    expect((window as any).__viewer?.renderer).toBeDefined();
    expect((window as any).__viewer?.scene).toBeDefined();
  });

  test('increments frame counter', async () => {
    await loadModel('ok.glb', 'viewer');
    expect((window as any).__viewerFrames).toBeGreaterThan(0);
  });

  test('respects container dimensions', async () => {
    const container = document.getElementById('viewer') as any;
    Object.defineProperty(container, 'clientWidth', { value: 250 });
    Object.defineProperty(container, 'clientHeight', { value: 200 });
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(250);
    expect(canvas.height).toBe(200);
  });

  test('uses default dimensions when container size missing', async () => {
    const container = document.getElementById('viewer') as any;
    Object.defineProperty(container, 'clientWidth', { value: 0 });
    Object.defineProperty(container, 'clientHeight', { value: 0 });
    await loadModel('ok.glb', 'viewer');
    const canvas = document.querySelector('#viewer canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(300);
  });

  test('shows fallback text when GLTF load fails', async () => {
    await loadModel('fail.glb', 'viewer');
    expect(document.getElementById('viewer')?.textContent).toMatch(/model not available/i);
  });

  test('does not expose viewer on GLTF failure', async () => {
    await loadModel('fail.glb', 'viewer');
    expect((window as any).__viewer).toBeUndefined();
  });

  test('frame counter not set on GLTF failure', async () => {
    await loadModel('fail.glb', 'viewer');
    expect((window as any).__viewerFrames).toBeUndefined();
  });

  test('logs error to console on GLTF failure', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await loadModel('fail.glb', 'viewer');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
