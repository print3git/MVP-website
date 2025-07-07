# Chaos Experiments

This repository includes optional chaos engineering scripts using the [Gremlin](https://www.gremlin.com/) free tier. These scripts are **not** executed in CI and are intended for manual runs only.

## Prerequisites

1. Create a Gremlin account and obtain your `GREMLIN_TEAM_ID` and `GREMLIN_API_KEY`.
2. Install dependencies:
   ```bash
   npm install https
   ```

## Available Experiments

### Kill Database Connection

`experiments/chaos/kill-db.js` terminates the database connection for 60 seconds to verify retry logic.

Run with:

```bash
GREMLIN_TEAM_ID=your-team GREMLIN_API_KEY=your-key node experiments/chaos/kill-db.js
```

### Inject High Latency

`experiments/chaos/high-latency.js` adds 3000ms of network latency on backend hosts for 60 seconds.

Run with:

```bash
GREMLIN_TEAM_ID=your-team GREMLIN_API_KEY=your-key node experiments/chaos/high-latency.js
```

## Notes

- These experiments affect live infrastructure. Use them only in staging or controlled environments.
- The scripts send HTTP requests to Gremlin's API; ensure your network allows outbound HTTPS traffic.
