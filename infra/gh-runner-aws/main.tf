provider "aws" {
  region = var.region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnet_ids" "default" {
  vpc_id = data.aws_vpc.default.id
}

resource "aws_security_group" "runner" {
  name        = "${var.name}-sg"
  description = "Security group for GitHub Actions runner allowing egress only"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name}-sg"
  }
}

resource "aws_iam_role" "runner" {
  name = "${var.name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "runner" {
  name = "${var.name}-profile"
  role = aws_iam_role.runner.name
}

data "aws_ami" "al2023" {
  owners      = ["amazon"]
  most_recent = true

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "runner" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  iam_instance_profile   = aws_iam_instance_profile.runner.name
  subnet_id              = data.aws_subnet_ids.default.ids[0]
  vpc_security_group_ids = [aws_security_group.runner.id]

  user_data = <<-EOF
              #!/bin/bash
              set -e
              yum update -y

              # Install Docker
              yum install -y docker
              systemctl enable docker
              systemctl start docker

              # Install GitHub Actions runner
              RUNNER_VERSION="2.317.0"
              cd /opt
              mkdir actions-runner && cd actions-runner
              curl -O -L https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
              tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
              ./bin/installdependencies.sh

              RUNNER_URL=$(aws ssm get-parameter --name /github/runner/url --query Parameter.Value --output text)
              TOKEN=$(aws ssm get-parameter --name /github/runner/registration-token --with-decryption --query Parameter.Value --output text)

              ./config.sh --url ${RUNNER_URL} --token ${TOKEN} --labels self-hosted,linux,aws,mvp-runner --unattended
              ./svc.sh install
              ./svc.sh start
              EOF

  tags = {
    Name = var.name
  }
}
