/* ============================================================
   Networking — use the account's default VPC + public subnets.
   A static site behind an ALB needs no private subnets or NAT.
   ============================================================ */
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security group for the ECS tasks — only cloudflared (on the CMS host) may
# reach the Next.js port. The public ALB was removed after the tunnel cutover.
resource "aws_security_group" "ecs" {
  name        = "${var.project}-ecs"
  description = "ECS task ingress from cloudflared only"
  vpc_id      = data.aws_vpc.default.id

  # From cloudflared (runs on the CMS host) — the tunnel forwards website
  # traffic to the web task on 3000. This is the only ingress now.
  ingress {
    description     = "From cloudflared on CMS host"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.cms_host.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
