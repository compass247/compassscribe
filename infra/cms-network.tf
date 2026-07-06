/* ============================================================
   CMS networking — security group for the EC2 host that runs the
   Directus + Postgres containers (ECS launch type EC2).

   Directus listens on 8055; only the ALB may reach it. Postgres
   runs as a sibling container on the same host and talks to
   Directus over the host's internal bridge network, so it needs
   NO public or SG-level ingress — it is never exposed.
   ============================================================ */

resource "aws_security_group" "cms_host" {
  name        = "${var.project}-cms-host"
  description = "ECS EC2 host for Directus - Directus port from ALB only"
  vpc_id      = data.aws_vpc.default.id

  # No Directus 8055 ingress: post-cutover, cloudflared reaches Directus
  # over the host's internal bridge link (same task), not across the SG.
  # The public ALB that used to hit 8055 was removed.

  # Optional break-glass SSH (disabled unless cms_ssh_cidr is set).
  # Prefer SSM Session Manager (no inbound port) for normal access.
  dynamic "ingress" {
    for_each = var.cms_ssh_cidr != "" ? [1] : []
    content {
      description = "SSH (break-glass)"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [var.cms_ssh_cidr]
    }
  }

  egress {
    description = "All outbound (pull images, S3, SES, Secrets Manager)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
