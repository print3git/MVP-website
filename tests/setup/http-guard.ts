import nock from 'nock';

nock.disableNetConnect();
nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);

afterEach(() => {
  const pending = nock.pendingMocks();
  if (pending.length > 0) {
    throw new Error(`Unused nock interceptors:\n${pending.join('\n')}`);
  }
  nock.cleanAll();
});
