variable "region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

source "amazon-ebs" "runner" {
  region        = var.region
  instance_type = var.instance_type
  ssh_username  = "ubuntu"
  ami_name      = "gha-runner-{{timestamp}}"

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"]
    most_recent = true
  }
}

build {
  name    = "runner"
  sources = ["source.amazon-ebs.runner"]

  provisioner "shell" {
    environment_vars = ["BUILD_IMAGE=1"]
    script           = "${path.root}/../userdata/bootstrap.sh"
  }
}
