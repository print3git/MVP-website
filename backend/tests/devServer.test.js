const axios = require("axios");
const app = require("../../scripts/dev-server");

let server;
let url;

beforeAll(
  () =>
    new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        url = `http://127.0.0.1:${port}`;
        resolve();
      });
    }),
);

afterAll(() => new Promise((resolve) => server.close(resolve)));

test("serves index at root", async () => {
  const res = await axios.head(url, { validateStatus: () => true });
  expect(res.status).toBe(200);
});
