terraform {
  backend "s3" {
    bucket = "glb-models-prod"
    key    = "terraform/state/infra.tfstate"
    region = "eu-north-1"
  }
}

variable "waf_web_acl_id" {
  description = "Optional WAF web ACL ID for CloudFront"
  type        = string
  default     = null
}




provider "random" {}

resource "aws_kms_key" "rds_pi" {
  description         = "RDS performance insights"
  enable_key_rotation = true
}

resource "random_password" "print3_db_password" {
  length  = 16
  special = true
}

data "aws_vpc" "model" {
  default = true
}

data "aws_subnets" "model" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.model.id]
  }
}

resource "aws_db_subnet_group" "print3_db_subnet_group" {
  name       = "print3-db-subnet-group"
  subnet_ids = data.aws_subnets.model.ids
}

resource "aws_security_group" "print3_db_sg" {
  name        = "print3-db-sg"
  description = "Allow backend access to RDS"
  vpc_id      = data.aws_vpc.model.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.model.cidr_block]
    description = "Postgres from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [data.aws_vpc.model.cidr_block]
    description = "Allow VPC egress"
  }
}

resource "aws_db_instance" "print3_metadata" {
  identifier                          = "print3-metadata-db"
  engine                              = "postgres"
  instance_class                      = "db.t3.micro"
  allocated_storage                   = 20
  username                            = "postgres"
  password                            = random_password.print3_db_password.result
  publicly_accessible                 = false
  skip_final_snapshot                 = true
  storage_encrypted                   = true
  backup_retention_period             = 7
  deletion_protection                 = true
  iam_database_authentication_enabled = true
  performance_insights_enabled        = true
  performance_insights_kms_key_id     = aws_kms_key.rds_pi.arn
  db_subnet_group_name                = aws_db_subnet_group.print3_db_subnet_group.name
  vpc_security_group_ids              = [aws_security_group.print3_db_sg.id]
}

output "print3_db_endpoint" {
  value = aws_db_instance.print3_metadata.endpoint
}

output "print3_db_password" {
  value     = random_password.print3_db_password.result
  sensitive = true
}

# CloudFront distribution for model assets
resource "aws_cloudfront_origin_access_identity" "model_oai" {
  comment = "OAI for glb-models-prod"
}

# Restrict S3 bucket access to the CloudFront OAI
resource "aws_s3_bucket_policy" "glb_models_policy" {
  bucket = "glb-models-prod"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          CanonicalUser = aws_cloudfront_origin_access_identity.model_oai.s3_canonical_user_id
        }
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::glb-models-prod/*"
      }
    ]
  })
}

# Block all direct public access to the bucket
resource "aws_s3_bucket_public_access_block" "glb_models_block" {
  bucket                  = "glb-models-prod"
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_distribution" "model_cdn" {
  enabled = true

  web_acl_id = var.waf_web_acl_id

  origin {
    domain_name = "glb-models-prod.s3.amazonaws.com"
    origin_id   = "glb-models-prod"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.model_oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "glb-models-prod"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 604800
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  logging_config {
    include_cookies = false
    bucket          = "logs.example.com.s3.amazonaws.com"
  }

  tags = {
    Project = "Print3"
  }
}

output "cloudfront_model_domain" {
  value = aws_cloudfront_distribution.model_cdn.domain_name
}
