/* ============================================================
   Cloudflare DNS for the site — apex + www + cms.

   CUTOVER SWITCH (var.route_via_tunnel):
   - false (default): records point at the ALB, DNS-only (grey), so the
     ALB's ACM cert terminates TLS with no Cloudflare proxy in front.
   - true: records point at the Cloudflare Tunnel, proxied (orange), so
     the tunnel serves traffic and the ALB can be retired. Requires
     Cloudflare SSL/TLS mode Full (strict).

   Rollback is a one-line change: flip route_via_tunnel back to false.

   Note: ALBs have no static IP, so we use CNAMEs. Cloudflare flattens
   the apex CNAME automatically.
   ============================================================ */
locals {
  # Where apex/www/cms point, and whether Cloudflare proxies them.
  site_cname   = var.route_via_tunnel ? cloudflare_zero_trust_tunnel_cloudflared.web.cname : aws_lb.web.dns_name
  site_proxied = var.route_via_tunnel # tunnel MUST be proxied; ALB path stays DNS-only
  site_ttl     = var.route_via_tunnel ? 1 : 300
}

resource "cloudflare_record" "apex" {
  zone_id         = var.cloudflare_zone_id
  name            = var.domain
  type            = "CNAME"
  content         = local.site_cname
  proxied         = local.site_proxied
  ttl             = local.site_ttl
  allow_overwrite = true
}

resource "cloudflare_record" "www" {
  zone_id         = var.cloudflare_zone_id
  name            = "www.${var.domain}"
  type            = "CNAME"
  content         = local.site_cname
  proxied         = local.site_proxied
  ttl             = local.site_ttl
  allow_overwrite = true
}

# CMS (Directus admin). ALB path: DNS-only so the ALB's ACM cert (with the
# cms SAN) terminates TLS. Tunnel path: proxied like the rest.
resource "cloudflare_record" "cms" {
  zone_id         = var.cloudflare_zone_id
  name            = var.cms_subdomain
  type            = "CNAME"
  content         = local.site_cname
  proxied         = local.site_proxied
  ttl             = local.site_ttl
  allow_overwrite = true
}

/* ------------------------------------------------------------
   TEMPORARY tunnel-test records — route through the Cloudflare
   Tunnel (proxied) so we can verify it works WHILE the real
   apex/www/cms still point at the ALB. Remove these (and set
   enable_tunnel_test_hostnames = false) at cutover.
   Must be proxied (orange) — cfargotunnel.com only works proxied.
   ------------------------------------------------------------ */
resource "cloudflare_record" "tunnel_test_web" {
  count           = var.enable_tunnel_test_hostnames ? 1 : 0
  zone_id         = var.cloudflare_zone_id
  name            = "tunnel-test.${var.domain}"
  type            = "CNAME"
  content         = cloudflare_zero_trust_tunnel_cloudflared.web.cname
  proxied         = true
  allow_overwrite = true
}

resource "cloudflare_record" "tunnel_test_cms" {
  count           = var.enable_tunnel_test_hostnames ? 1 : 0
  zone_id         = var.cloudflare_zone_id
  name            = "cms-test.${var.domain}"
  type            = "CNAME"
  content         = cloudflare_zero_trust_tunnel_cloudflared.web.cname
  proxied         = true
  allow_overwrite = true
}
