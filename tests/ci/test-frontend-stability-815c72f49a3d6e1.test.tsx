/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import babel from '@babel/core';
import Module from 'module';

function loadComponent(rel) {
  const abs = path.join(__dirname, '..', '..', rel);
  let src = fs.readFileSync(abs, 'utf8');
  src = src
    .replace(/from "https:\/\/esm\.sh\/react@18"/g, "from 'react'")
    .replace(/from "https:\/\/esm\.sh\/@react-three\/fiber@8"/g, "from '@react-three/fiber'")
    .replace(/from "https:\/\/esm\.sh\/@react-three\/drei@9"/g, "from '@react-three/drei'");
  const { code } = babel.transformSync(src, {
    filename: path.basename(rel),
    presets: [[require.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [
      [require.resolve('@babel/plugin-syntax-typescript'), { isTSX: true }],
      require.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  const m = new Module(abs);
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  const stubs = {
    '@react-three/fiber': { Canvas: (p) => React.createElement('canvas', p, p.children) },
    '@react-three/drei': { Gltf: (p) => React.createElement('gltf', p) },
  };
  m.require = (id) => {
    if (id === 'react') return React;
    if (stubs[id]) return stubs[id];
    return require(id);
  };
  m._compile(code, abs);
  return m.exports.default || m.exports;
}

let browser;
let page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });
});

afterAll(async () => {
  await browser.close();
});

async function screenshotMarkup(markup) {
  await page.setContent(`<div id="root">${markup}</div>`);
  return page.screenshot({ fullPage: true });
}

describe('frontend stability', () => {
  test('CheckoutForm snapshot', async () => {
    const CheckoutForm = loadComponent('src/components/CheckoutForm.js');
    const { container } = render(React.createElement(CheckoutForm));
    expect(container.firstChild).toMatchSnapshot();
    const shot = await screenshotMarkup(container.innerHTML);
    expect(shot).toMatchSnapshot('CheckoutForm.png');
  });

  test('ModelViewer snapshot', async () => {
    const ModelViewer = loadComponent('js/ModelViewer.js');
    const { container } = render(React.createElement(ModelViewer, { url: 'models/bag.glb' }));
    expect(container.firstChild).toMatchSnapshot();
    const shot = await screenshotMarkup(container.innerHTML);
    expect(shot).toMatchSnapshot('ModelViewer.png');
  });
});
