terraform {
  backend "s3" {
    bucket = "glb-models-prod"
    key    = "terraform/state/infra.tfstate"
    region = "eu-north-1"
  }
}

provider "aws" {
  region = "eu-north-1"
}

provider "random" {}

#----------------------------------------
# RDS for metadata
#----------------------------------------

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
    cidr_blocks = ["0.0.0.0/0"]   # tighten this later
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "print3_metadata" {
  identifier            = "print3-metadata-db"
  engine                = "postgres"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  username              = "postgres"
  password              = random_password.print3_db_password.result
  publicly_accessible   = false
  skip_final_snapshot   = true
  db_subnet_group_name  = aws_db_subnet_group.print3_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.print3_db_sg.id]
}

output "print3_db_endpoint" {
  value = aws_db_instance.print3_metadata.endpoint
}

output "print3_db_password" {
  value     = random_password.print3_db_password.result
  sensitive = true
}

#----------------------------------------
# CloudFront + S3 lock-down
#----------------------------------------

resource "aws_cloudfront_origin_access_identity" "model_oai" {
  comment = "OAI for glb-models-prod"
}

resource "aws_s3_bucket_policy" "glb_models_policy" {
  bucket = "glb-models-prod"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          CanonicalUser = aws_cloudfront_origin_access_identity.model_oai.s3_canonical_user_id
        }
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::glb-models-prod/*"
      }
    ]
  })
}

resource "aws_s3_bucket_public_access_block" "glb_models_block" {
  bucket                  = "glb-models-prod"
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_distribution" "model_cdn" {
  enabled = true

  origin {
    domain_name = "glb-models-prod.s3.amazonaws.com"
    origin_id   = "glb-s3-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.model_oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    target_origin_id       = "glb-s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 604800   # 7 days
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project = "Print3"
  }
}

output "cloudfront_model_domain" {
  value = aws_cloudfront_distribution.model_cdn.domain_name
}
