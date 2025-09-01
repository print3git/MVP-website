#!/usr/bin/env bash
set -euo pipefail

AWS_REGION_S3="${AWS_REGION_S3:?Missing AWS_REGION_S3}"
S3_BUCKET="${S3_BUCKET:?Missing S3_BUCKET}"

# 1) Create bucket (safe to re-run)
aws s3api create-bucket \
  --bucket "$S3_BUCKET" \
  --region "$AWS_REGION_S3" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION_S3" \
  2>/dev/null || true

# 2) Encryption + block public access (keep private; serve via CloudFront if needed)
aws s3api put-bucket-encryption --bucket "$S3_BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block --bucket "$S3_BUCKET" \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# 3) Ensure EXACTLY TWO top-level prefixes exist
aws s3 cp /dev/null "s3://$S3_BUCKET/repo-assets/.keep"
aws s3 cp /dev/null "s3://$S3_BUCKET/user-models/.keep"

# 4) Hygiene: show anything that’s NOT under those two prefixes
echo "Objects outside allowed prefixes (should be empty):"
aws s3api list-objects-v2 --bucket "$S3_BUCKET" --query \
"Contents[?!(starts_with(Key, 'repo-assets/') || starts_with(Key, 'user-models/'))].Key"
