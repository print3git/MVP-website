export class WebGLRenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
  }
  setSize(width, height) {
    this.domElement.width = width;
    this.domElement.height = height;
  }
  render() {}
}
export class Scene {
  add() {}
}
export class PerspectiveCamera {
  constructor() {
    this.position = { z: 0 };
  }
}
export class DirectionalLight {
  constructor() {
    this.position = { set() {} };
  }
}
