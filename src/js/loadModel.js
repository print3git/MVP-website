/**
 * Load a GLB model into a container element.
 * @param {string} url path to the .glb file
 * @param {string} containerId id of the element to host the canvas
 */
export async function loadModel(url, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container #${containerId} not found`);
  }

  let THREE;
  let GLTFLoader;
  try {
    const [threeMod, gltfMod] = await Promise.all([
      import(
        "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js"
      ),
      import(
        "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js"
      ),
    ]);
    THREE = threeMod;
    ({ GLTFLoader } = gltfMod);
  } catch (err) {
    console.error("Three.js failed to load", err);
    container.textContent = "model not available";
    return;
  }

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 300;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "3D model preview");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 2;

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const loader = new GLTFLoader();
  try {
    await new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          scene.add(gltf.scene);
          resolve();
        },
        undefined,
        reject,
      );
    });
  } catch (err) {
    console.error("GLTF load failed", err);
    container.textContent = "model not available";
    return;
  }

  window.__viewerFrames = 0;
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    window.__viewerFrames++;
  }
  animate();

  // expose for tests
  window.__viewer = { scene, renderer };
}
