export class GLTFLoader {
  load(url, onLoad, _onProgress, onError) {
    if (url.includes('fail')) {
      onError(new Error('failed'));
    } else {
      setTimeout(() => onLoad({ scene: {} }), 0);
    }
  }
}
