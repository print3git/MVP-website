# IAM policies for least-privilege access

# Allow only GetObject on the models bucket
data "aws_iam_policy_document" "s3_get_object_only" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::glb-models-prod/*"]
    effect    = "Allow"
  }
}

resource "aws_iam_policy" "s3_get_object_only" {
  name   = "s3-get-object-only"
  policy = data.aws_iam_policy_document.s3_get_object_only.json
}

# Deny IAM database authentication to enforce password-only access
data "aws_iam_policy_document" "rds_password_auth_only" {
  statement {
    effect    = "Deny"
    actions   = ["rds-db:connect"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "rds_password_auth_only" {
  name   = "rds-password-auth-only"
  policy = data.aws_iam_policy_document.rds_password_auth_only.json
}
