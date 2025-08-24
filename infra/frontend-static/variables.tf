variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket for static frontend"
}

variable "aws_region" {
  type        = string
  description = "AWS region for the S3 bucket"
  default     = "us-east-1"
}

variable "domain_name" {
  type        = string
  description = "Optional domain name for the CloudFront distribution"
  default     = ""
}

variable "hosted_zone_id" {
  type        = string
  description = "Route53 hosted zone ID for domain"
  default     = ""
}
