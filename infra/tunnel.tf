/* ============================================================
   Cloudflare Tunnel — replaces the public ALB as the ingress.

   WHY: an internet-facing ALB costs ~$5.67/mo plus one public IPv4
   per AZ it spans (~$3.6/mo each). A Cloudflare Tunnel is free on the
   Free plan and needs NO public IPv4: `cloudflared` dials OUT to the
   Cloudflare edge, so no inbound ports and no public addresses are
   required. Cloudflare terminates TLS at its edge and routes by
   hostname — exactly the two jobs the ALB did.

   ROLLOUT (see the plan): this file is ADDITIVE. It stands the tunnel
   up ALONGSIDE the ALB. DNS is NOT switched here — apex/www/cms still
   point at the ALB until the tunnel is verified. Only after cutover +
   a soak period do we delete alb.tf / acm.tf.

   Provider note: cloudflare ~> 4.48 (4.52 installed). Uses the
   `cloudflare_zero_trust_tunnel_cloudflared*` resource names (the older
   `cloudflare_tunnel*` aliases are deprecated in 4.5x).
   ============================================================ */

# A 32-byte random secret the tunnel is created with. cloudflared uses
# it (baked into the tunnel token) to authenticate to the edge.
resource "random_password" "tunnel_secret" {
  length  = 48
  special = false
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "web" {
  account_id = var.cloudflare_account_id
  name       = "${var.project}-web"
  secret     = base64encode(random_password.tunnel_secret.result)
  config_src = "cloudflare" # config managed here via the *_config resource
}

# Ingress routing — the tunnel's equivalent of the ALB listener rules.
# First match wins; the final catch-all (no hostname) returns 404, which
# cloudflared requires as the last rule.
locals {
  # Cloud Map private DNS name of the web service (stable across deploys).
  web_tunnel_service = "http://${aws_service_discovery_service.web.name}.${aws_service_discovery_private_dns_namespace.internal.name}:3000"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "web" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.web.id

  config {
    # CMS (Directus) — cloudflared is a sibling container linked to
    # `directus` on the same bridge network, so it reaches it by name.
    ingress_rule {
      hostname = var.cms_subdomain
      service  = "http://directus:8055"
    }

    # Website (Next.js) — reached via the Cloud Map private DNS name of
    # the Fargate web service (stable across task replacements). The
    # namespace/service are defined in service-discovery.tf.
    ingress_rule {
      hostname = var.domain
      service  = local.web_tunnel_service
    }
    ingress_rule {
      hostname = "www.${var.domain}"
      service  = local.web_tunnel_service
    }

    # TEMPORARY test hostnames — let us curl the tunnel path (web + CMS)
    # while the real domains still point at the ALB. Removed at cutover
    # (set enable_tunnel_test_hostnames = false). See dns.tf for the
    # matching DNS records.
    dynamic "ingress_rule" {
      for_each = var.enable_tunnel_test_hostnames ? [1] : []
      content {
        hostname = "tunnel-test.${var.domain}"
        service  = local.web_tunnel_service
      }
    }
    dynamic "ingress_rule" {
      for_each = var.enable_tunnel_test_hostnames ? [1] : []
      content {
        hostname = "cms-test.${var.domain}"
        service  = "http://directus:8055"
      }
    }

    # Required catch-all.
    ingress_rule {
      service = "http_status:404"
    }
  }
}

output "tunnel_id" {
  description = "Cloudflare Tunnel ID — apex/www/cms CNAME target is <id>.cfargotunnel.com after cutover."
  value       = cloudflare_zero_trust_tunnel_cloudflared.web.id
}

output "tunnel_cname_target" {
  description = "CNAME target for the proxied apex/www/cms records after cutover."
  value       = "${cloudflare_zero_trust_tunnel_cloudflared.web.id}.cfargotunnel.com"
}
