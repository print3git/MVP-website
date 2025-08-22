# CI Metrics

The `ci-metrics-emit` action aggregates job timing data and test inventory into a single `ci/metrics/series.ndjson` artifact. The artifact can optionally be published to AWS CloudWatch under the `CI/MVPWebsite` namespace when `AWS_CI_METRICS=1` and an OIDC role is available.

## Dashboard

Below is a minimal Grafana dashboard JSON that reads from CloudWatch and plots basic metrics:

```json
{
  "title": "CI Metrics",
  "panels": [
    {
      "type": "timeseries",
      "title": "Queued Jobs",
      "targets": [{ "namespace": "CI/MVPWebsite", "metricName": "QueuedJobs" }]
    }
  ]
}
```

Import the JSON into Grafana or CloudWatch to visualize queue depths and job health over time.
