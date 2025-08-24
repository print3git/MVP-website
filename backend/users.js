const db = require("./db");

async function findUserById(id) {
  const { rows } = await db.query(
    "SELECT id, username, email FROM users WHERE id=$1",
    [id],
  );
  return rows[0];
}

module.exports = {
  findUserById,
};
