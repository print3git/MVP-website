# Runner autoscaler

Provisions a Lambda function invoked every minute via EventBridge. The function
checks the repository's queued workflow jobs and scales an Auto Scaling Group
so its desired capacity is the lesser of the queued jobs and the configured
maximum. When no jobs are queued the group scales to zero. A `burst_multiplier`
allows overprovisioning and `label_quotas` caps runner counts per job label.
