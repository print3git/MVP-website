terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.bucket_name}-oac"
  description                       = "OAC for ${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.this.bucket_regional_domain_name
    origin_id                = aws_s3_bucket.this.id
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.this.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.domain_name != "" ? aws_acm_certificate.this[0].arn : null
    ssl_support_method             = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version       = var.domain_name != "" ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.domain_name == "" ? true : null
  }

  depends_on = var.domain_name != "" ? [aws_acm_certificate_validation.this] : []
}

resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowCloudFrontServicePrincipalReadOnly"
        Effect   = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.this.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.this.arn
          }
        }
      }
    ]
  })
}

resource "aws_acm_certificate" "this" {
  provider          = aws.us-east-1
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  count   = var.domain_name != "" ? length(aws_acm_certificate.this[0].domain_validation_options) : 0
  name    = aws_acm_certificate.this[0].domain_validation_options[count.index].resource_record_name
  type    = aws_acm_certificate.this[0].domain_validation_options[count.index].resource_record_type
  zone_id = var.hosted_zone_id
  records = [aws_acm_certificate.this[0].domain_validation_options[count.index].resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "this" {
  provider                = aws.us-east-1
  count                   = var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}

resource "aws_route53_record" "this" {
  count   = var.domain_name != "" ? 1 : 0
  name    = var.domain_name
  zone_id = var.hosted_zone_id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}

output "bucket_name" {
  value = aws_s3_bucket.this.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "distribution_domain" {
  value = aws_cloudfront_distribution.this.domain_name
}
