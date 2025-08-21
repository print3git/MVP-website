data "aws_default_vpc" "default" {}

data "aws_availability_zones" "available" {}

data "aws_subnet" "default" {
  default_for_az    = true
  availability_zone = data.aws_availability_zones.available.names[0]
}

data "http" "my_ip" {
  url = "https://checkip.amazonaws.com/"
}

resource "aws_security_group" "runner" {
  name_prefix = "gha-runner-"
  description = "Security group for GitHub Actions runner"
  vpc_id      = data.aws_default_vpc.default.id

  ingress {
    description = "SSH from current IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${chomp(data.http.my_ip.response_body)}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_ami" "al2023" {
  owners      = ["amazon"]
  most_recent = true

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "runner" {
  name_prefix        = "gha-runner-"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cw" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "runner" {
  name_prefix = "gha-runner-"
  role        = aws_iam_role.runner.name
}

resource "aws_instance" "runner" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnet.default.id
  vpc_security_group_ids      = [aws_security_group.runner.id]
  iam_instance_profile        = aws_iam_instance_profile.runner.name
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "gha-selfhosted-runner"
  }
}

resource "aws_ssm_association" "runner_setup" {
  name = "AWS-RunShellScript"

  targets {
    key    = "InstanceIds"
    values = [aws_instance.runner.id]
  }

  parameters = {
    commands = [templatefile("${path.module}/userdata.sh", {
      repo_owner = var.repo_owner
      repo_name  = var.repo_name
      labels     = var.labels
    })]
  }

  depends_on = [aws_instance.runner]
}
