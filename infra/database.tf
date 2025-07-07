provider "aws" {
  region = "eu-north-1"
}

resource "random_password" "metadata_db_password" {
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

resource "aws_db_subnet_group" "metadata_subnets" {
  name       = "metadata-db-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "metadata_sg" {
  name        = "metadata-db-sg"
  description = "Allow PostgreSQL access"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
    description = "Postgres from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
    description = "Allow VPC egress"
  }
}

resource "aws_db_instance" "metadata_db" {
  engine                              = "postgres"
  instance_class                      = "db.t3.micro"
  allocated_storage                   = 20
  username                            = "metadata_user"
  password                            = random_password.metadata_db_password.result
  publicly_accessible                 = false
  skip_final_snapshot                 = true
  storage_encrypted                   = true
  backup_retention_period             = 7
  deletion_protection                 = true
  iam_database_authentication_enabled = true
  performance_insights_enabled        = true
  performance_insights_kms_key_id     = aws_kms_key.rds_pi.arn
  db_subnet_group_name                = aws_db_subnet_group.metadata_subnets.name
  vpc_security_group_ids              = [aws_security_group.metadata_sg.id]
}

output "metadata_db_endpoint" {
  value     = aws_db_instance.metadata_db.endpoint
  sensitive = true
}

output "metadata_db_password" {
  value     = random_password.metadata_db_password.result
  sensitive = true
}
