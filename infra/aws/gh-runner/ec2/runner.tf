provider "aws" {
  region = var.aws_region
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_launch_template" "runner" {
  name_prefix   = "gh-runner-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.small"

  iam_instance_profile {
    name = aws_iam_instance_profile.runner.name
  }

  user_data = filebase64("${path.module}/../scripts/userdata.sh")
}

resource "aws_iam_instance_profile" "runner" {
  name = "gh-runner-profile"
  role = aws_iam_role.github_runners.name
}

resource "aws_autoscaling_group" "runner" {
  name                      = "gh-runner-asg"
  min_size                  = 0
  max_size                  = 2
  desired_capacity          = 1
  vpc_zone_identifier       = var.subnet_ids
  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }
  lifecycle {
    create_before_destroy = true
  }
  tag {
    key                 = "Name"
    value               = "gh-runner"
    propagate_at_launch = true
  }
}
