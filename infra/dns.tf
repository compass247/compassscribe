/* ============================================================
   Cloudflare DNS for the site — apex + www point at the ALB.
   DNS-only (grey cloud) by default so the ALB's ACM cert
   terminates TLS without a Cloudflare proxy in front.

   Note: ALBs have no static IP, so we use CNAMEs. Cloudflare
   flattens the apex CNAME automatically.
   ============================================================ */
resource "cloudflare_record" "apex" {
  zone_id         = var.cloudflare_zone_id
  name            = var.domain
  type            = "CNAME"
  content         = aws_lb.web.dns_name
  proxied         = var.cloudflare_proxied
  ttl             = var.cloudflare_proxied ? 1 : 300
  allow_overwrite = true
}

resource "cloudflare_record" "www" {
  zone_id         = var.cloudflare_zone_id
  name            = "www.${var.domain}"
  type            = "CNAME"
  content         = aws_lb.web.dns_name
  proxied         = var.cloudflare_proxied
  ttl             = var.cloudflare_proxied ? 1 : 300
  allow_overwrite = true
}

# CMS (Directus admin) — CNAME to the same ALB. DNS-only so the ALB's ACM
# cert (which now includes the cms SAN) terminates TLS.
resource "cloudflare_record" "cms" {
  zone_id         = var.cloudflare_zone_id
  name            = var.cms_subdomain
  type            = "CNAME"
  content         = aws_lb.web.dns_name
  proxied         = false
  ttl             = 300
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
