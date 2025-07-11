import React, { useState } from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';
import useGenerateModel from './useGenerateModel.js';

function GeneratorApp() {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const { generate, loading, modelUrl, error } = useGenerateModel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await generate(prompt, file);
  };

  return React.createElement(
    'div',
    { className: 'space-y-4' },
    React.createElement(
      'form',
      { onSubmit: handleSubmit, className: 'space-y-2' },
      React.createElement('input', {
        id: 'gen-prompt',
        type: 'text',
        value: prompt,
        onChange: (e) => setPrompt(e.target.value),
        className: 'border p-2 w-full text-black',
        placeholder: 'Enter prompt',
        required: true,
      }),
      React.createElement('input', {
        id: 'gen-image',
        type: 'file',
        accept: 'image/*',
        onChange: (e) => setFile(e.target.files[0] || null),
      }),
      React.createElement(
        'button',
        {
          id: 'gen-submit',
          type: 'submit',
          className: 'px-4 py-2 bg-blue-600 text-white rounded',
          disabled: loading,
        },
        loading ? 'Generating...' : 'Generate 3D'
      )
    ),
    loading &&
      React.createElement('div', {
        className:
          'animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full',
      }),
    error && React.createElement('p', { className: 'text-red-500' }, error),
    modelUrl &&
      React.createElement('model-viewer', {
        id: 'gen-viewer',
        src: modelUrl,
        style: 'width: 100%; height: 300px;',
        autoplay: true,
        'camera-controls': true,
      })
  );
}

const rootEl = document.getElementById('gen-app');
if (rootEl) {
  createRoot(rootEl).render(React.createElement(GeneratorApp));
}
