/** @jest-environment jsdom */
const React = require('react');
const { act } = require('react-dom/test-utils');
const { createRoot } = require('react-dom/client');
const useJobPolling = require('../../js/useJobPolling.node.js');

jest.useFakeTimers();

test('polls until complete', async () => {
  console.error.mockImplementation(() => {});
  const responses = [
    { status: 'pending' },
    { status: 'complete', model_url: '/m.glb' },
  ];
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(responses.shift()) })
  );
  let result;
  function Wrapper() {
    result = useJobPolling('123');
    return null;
  }
  const div = document.createElement('div');
  let root;
  await act(async () => {
    root = createRoot(div);
    root.render(React.createElement(Wrapper));
  });
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(result.status).toBe('complete');
  expect(result.glbUrl).toBe('/m.glb');
  await act(async () => root.unmount());
});
