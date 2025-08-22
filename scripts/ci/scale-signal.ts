import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";

async function main(): Promise<void> {
  const region = process.env.AWS_REGION || "us-east-1";
  const client = new CloudWatchClient({ region });
  await client.send(
    new PutMetricDataCommand({
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
