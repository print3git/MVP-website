provider "random" {}

resource "random_password" "print3_db_password" {
  length  = 16
  special = true
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_db_subnet_group" "print3_db_subnet_group" {
  name       = "print3-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "print3_db_sg" {
  name        = "print3-db-sg"
  description = "Allow backend access to RDS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Replace with backend IP/CIDR for production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "print3_metadata" {
  identifier               = "print3-metadata-db"
  engine                   = "postgres"
  instance_class           = "db.t3.micro"
  allocated_storage        = 20
  username                 = "postgres"
  password                 = random_password.print3_db_password.result
  publicly_accessible      = false
  skip_final_snapshot      = true
  db_subnet_group_name     = aws_db_subnet_group.print3_db_subnet_group.name
  vpc_security_group_ids   = [aws_security_group.print3_db_sg.id]
}

output "print3_db_endpoint" {
  value = aws_db_instance.print3_metadata.endpoint
}

output "print3_db_password" {
  value     = random_password.print3_db_password.result
  sensitive = true
}
