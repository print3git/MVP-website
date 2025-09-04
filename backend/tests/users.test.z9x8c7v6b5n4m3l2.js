jest.mock("../db", () => ({
  query: jest.fn(),
}));

const db = require("../db");
const { findUserById } = require("../users");

describe("findUserById", () => {
  test("returns user row", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: "1", username: "u", email: "e" }],
    });
    const user = await findUserById("1");
    expect(user).toEqual({ id: "1", username: "u", email: "e" });
    expect(db.query).toHaveBeenCalledWith(
      "SELECT id, username, email FROM users WHERE id=$1",
      ["1"],
    );
  });

  test("returns undefined when no rows", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const user = await findUserById("2");
    expect(user).toBeUndefined();
  });
});
