"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
async function main() {
  const region = process.env.AWS_REGION || "us-east-1";
  const client = new client_cloudwatch_1.CloudWatchClient({ region });
  await client.send(
    new client_cloudwatch_1.PutMetricDataCommand({
      Namespace: "CI/Capacity",
      MetricData: [
        {
          MetricName: "ScaleUp",
          Unit: "Count",
          Value: 1,
          Timestamp: new Date(),
        },
      ],
    }),
  );
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
