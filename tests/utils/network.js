function recordRequests(page) {
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));
  return () => requests;
}

module.exports = { recordRequests };
