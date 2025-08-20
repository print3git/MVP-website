import nock from "nock";

/**
 * Block all outgoing network connections except localhost to ensure tests
 * explicitly mock external services.
 */
nock.disableNetConnect();
nock.enableNetConnect("127.0.0.1|localhost");

const unmatched: string[] = [];

// Capture any requests that do not have an active mock so we can fail the test
nock.emitter.on("no match", (req) => {
  const method = req.method;
  const { protocol = "http:", host, path } = req.options || ({} as any);
  unmatched.push(`${method} ${protocol}//${host}${path}`);
});

export const mockStability = () => nock("https://api.stability.ai");
export const mockStripe = () => nock("https://api.stripe.com");
export const mockS3 = (bucket = process.env.S3_UPLOAD_BUCKET || "") =>
  nock(`https://${bucket}.s3.amazonaws.com`);

declare global {
  // eslint-disable-next-line no-var
  var mockStability: typeof mockStability;
  // eslint-disable-next-line no-var
  var mockStripe: typeof mockStripe;
  // eslint-disable-next-line no-var
  var mockS3: typeof mockS3;
}

global.mockStability = mockStability;
global.mockStripe = mockStripe;
global.mockS3 = mockS3;

afterEach(() => {
  const pending = nock.pendingMocks();
  if (pending.length > 0) {
    throw new Error(`Unused nock interceptors:\n${pending.join("\n")}`);
  }
  if (unmatched.length > 0) {
    throw new Error(`Unmocked requests:\n${unmatched.join("\n")}`);
  }
  unmatched.length = 0;
  nock.cleanAll();
});
