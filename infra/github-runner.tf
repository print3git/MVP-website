# EC2 instance for GitHub Actions runner

data "aws_ami" "ubuntu_2204" {
  owners      = ["099720109477"] # Canonical
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "github_runner" {
  name        = "github-runner-sg"
  description = "Allow SSH, HTTPS, and GitHub Actions runner traffic"
  vpc_id      = data.aws_vpc.model.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "GitHub Actions runner outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_iam_policy_document" "github_runner_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "github_runner" {
  name_prefix        = "github-runner-"
  assume_role_policy = data.aws_iam_policy_document.github_runner_assume.json
}

variable "artifact_bucket" {
  description = "S3 bucket for GitHub Actions artifacts"
  type        = string
}

data "aws_iam_policy_document" "github_runner_s3" {
  statement {
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      "arn:aws:s3:::${var.artifact_bucket}",
      "arn:aws:s3:::${var.artifact_bucket}/*"
    ]
  }
}

data "aws_iam_policy_document" "github_runner_cw" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_policy" "github_runner_s3" {
  name   = "github-runner-s3"
  policy = data.aws_iam_policy_document.github_runner_s3.json
}

resource "aws_iam_policy" "github_runner_cw" {
  name   = "github-runner-cw"
  policy = data.aws_iam_policy_document.github_runner_cw.json
}

resource "aws_iam_role_policy_attachment" "github_runner_s3" {
  role       = aws_iam_role.github_runner.name
  policy_arn = aws_iam_policy.github_runner_s3.arn
}

resource "aws_iam_role_policy_attachment" "github_runner_cw" {
  role       = aws_iam_role.github_runner.name
  policy_arn = aws_iam_policy.github_runner_cw.arn
}

resource "aws_iam_instance_profile" "github_runner" {
  name_prefix = "github-runner-"
  role        = aws_iam_role.github_runner.name
}

resource "aws_instance" "github_runner" {
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = "t3.medium"
  subnet_id                   = data.aws_subnets.model.ids[0]
  vpc_security_group_ids      = [aws_security_group.github_runner.id]
  iam_instance_profile        = aws_iam_instance_profile.github_runner.name
  associate_public_ip_address = true

  tags = {
    Name = "github-actions-runner"
  }
}

output "github_runner_public_ip" {
  value = aws_instance.github_runner.public_ip
}

output "github_runner_instance_id" {
  value = aws_instance.github_runner.id
}

