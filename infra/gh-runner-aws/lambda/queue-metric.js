const { Octokit } = require("@octokit/rest");
const AWS = require("aws-sdk");

exports.handler = async () => {
  const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const cw = new AWS.CloudWatch();

  const { data } = await github.actions.listWorkflowRunsForRepo({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    status: "queued",
    per_page: 100,
  });

  const queued = data.total_count || 0;

  await cw
    .putMetricData({
      Namespace: "GitHubActions",
      MetricData: [{ MetricName: "QueuedJobs", Value: queued, Unit: "Count" }],
    })
    .promise();
};
