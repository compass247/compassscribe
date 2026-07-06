/* ============================================================
   AWS Cloud Map service discovery for the Fargate web service.

   WHY: a Fargate task gets a NEW private IP every deploy. cloudflared
   (in tunnel.tf) needs a STABLE address to forward website traffic to.
   The ALB solved this with a target group; without the ALB we give the
   web service a private DNS name (web.cmas.local) that ECS keeps
   pointing at the current task's IP automatically.

   ADDITIVE: creating the namespace + service does nothing on its own.
   The web ECS service registers with it via `service_registries`
   (added in ecs.tf during cutover). Until then this is inert.
   ============================================================ */

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name        = "${var.project}.local"
  description = "Private DNS for intra-VPC service discovery (cloudflared -> web)."
  vpc         = data.aws_vpc.default.id
}

resource "aws_service_discovery_service" "web" {
  name = "web"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      type = "A"
      ttl  = 10
    }

    # Fargate awsvpc tasks register their own ENI IP; MULTIVALUE returns
    # all healthy task IPs (supports desired_count > 1 later).
    routing_policy = "MULTIVALUE"
  }

  # ECS manages instance health via the service; Cloud Map custom health
  # checks would double-count, so we only keep the failure threshold.
  health_check_custom_config {
    failure_threshold = 1
  }
}
