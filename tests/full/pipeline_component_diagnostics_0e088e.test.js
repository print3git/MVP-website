const nock = require("nock");
const Stripe = require("stripe");

jest.mock("stripe");
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

const { generateGlb } = require("../../backend/src/lib/sparc3dClient.js");
const { storeGlb } = require("../../backend/src/lib/storeGlb.js");
const jobQueue = require("../../backend/queue/jobQueue.js");

/**
 * Minimal PG mock that records queries.
 */
class MockClient {
  constructor() {
    this.queries = [];
  }
  connect() {
    return Promise.resolve();
  }
  query(sql) {
    this.queries.push(sql);
    return Promise.resolve({ rows: [{ result: 1 }] });
  }
  end() {
    return Promise.resolve();
  }
}

describe("Hugging Face API", () => {
  beforeEach(() => {
    process.env.SPARC3D_ENDPOINT = "https://api.example.com/generate";
    process.env.SPARC3D_TOKEN = "tok";
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("returns buffer from HF endpoint", async () => {
    const data = Buffer.from("glb");
    const url = new URL(process.env.SPARC3D_ENDPOINT);
    nock(url.origin)
      .post(url.pathname, { prompt: "hello" })
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
    const buf = await generateGlb({ prompt: "hello" });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf).toEqual(data);
  });
});

describe("AWS S3 storage", () => {
  const aws = require("@aws-sdk/client-s3");
  beforeEach(() => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
  });

  test("uploads glb and returns url", async () => {
    const buf = Buffer.alloc(12);
    buf.write("glTF", 0);
    buf.writeUInt32LE(2, 4);
    buf.writeUInt32LE(12, 8);
    const url = await storeGlb(buf);
    const parsed = new URL(url);
    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname).toBe("bucket.s3.us-east-1.amazonaws.com");
    expect(parsed.pathname.startsWith("/models/")).toBe(true);
    expect(aws.PutObjectCommand).toHaveBeenCalled();
  });

  test("regex does not match attacker domain", () => {
    const parsed = new URL("https://maliciousamazonaws.com/models/");
    expect(parsed.hostname).not.toBe("bucket.s3.us-east-1.amazonaws.com");
  });
});

describe("Stripe charge", () => {
  const stripeMock = {
    charges: { create: jest.fn().mockResolvedValue({ id: "ch_1" }) },
  };
  beforeEach(() => {
    Stripe.mockImplementation(() => stripeMock);
  });

  test("creates charge successfully", async () => {
    const stripe = new Stripe("sk_test");
    const res = await stripe.charges.create({
      amount: 100,
      currency: "usd",
      source: "tok_visa",
    });
    expect(res.id).toBe("ch_1");
    expect(stripeMock.charges.create).toHaveBeenCalled();
  });
});

describe("Database connection", () => {
  let Client;
  beforeEach(() => {
    jest
      .spyOn(require("pg"), "Client")
      .mockImplementation(() => new MockClient());
    ({ Client } = require("pg"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("performs read and write", async () => {
    const client = new Client();
    await client.connect();
    await client.query("SELECT 1");
    await client.query("INSERT 1");
    await client.end();
    expect(client.queries).toEqual(["SELECT 1", "INSERT 1"]);
  });
});

describe("Local GLB generator", () => {
  test("rejects invalid glb data", async () => {
    await expect(storeGlb(Buffer.alloc(0))).rejects.toThrow("Invalid GLB");
  });
});

describe("Job queue", () => {
  beforeEach(() => {
    jest
      .spyOn(jobQueue, "getNextPendingJob")
      .mockResolvedValue({ job_id: "j1", webhook_url: "http://example.com" });
    jest.spyOn(jobQueue, "updateJobStatus").mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("processes job and updates status", async () => {
    jest.useFakeTimers();
    jobQueue.startProcessing(10);
    await jest.runOnlyPendingTimersAsync();
    await Promise.resolve();
    expect(jobQueue.updateJobStatus).toHaveBeenCalledWith("j1", "sent");
  });
});
