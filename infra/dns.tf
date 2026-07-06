/* ============================================================
   Cloudflare DNS for the site — apex + www + cms all point at the
   Cloudflare Tunnel (proxied). The public ALB was retired after the
   tunnel cutover, so there is no longer an ALB/DNS-only path.

   Proxied (orange) is required: cfargotunnel.com only resolves through
   the Cloudflare proxy. TLS is terminated at the Cloudflare edge.
   ============================================================ */
locals {
  site_cname = cloudflare_zero_trust_tunnel_cloudflared.web.cname
}

resource "cloudflare_record" "apex" {
  zone_id         = var.cloudflare_zone_id
  name            = var.domain
  type            = "CNAME"
  content         = local.site_cname
  proxied         = true
  ttl             = 1 # ttl is ignored while proxied; 1 = "automatic"
  allow_overwrite = true
}

resource "cloudflare_record" "www" {
  zone_id         = var.cloudflare_zone_id
  name            = "www.${var.domain}"
  type            = "CNAME"
  content         = local.site_cname
  proxied         = true
  ttl             = 1
  allow_overwrite = true
}

resource "cloudflare_record" "cms" {
  zone_id         = var.cloudflare_zone_id
  name            = var.cms_subdomain
  type            = "CNAME"
  content         = local.site_cname
  proxied         = true
  ttl             = 1
  allow_overwrite = true
}
