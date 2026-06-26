# Chạy & test ở máy LOCAL trước khi lên production

Từ giờ: **mọi thay đổi CMS (schema, script, trang mới) phải test ở máy local
trước, chạy đúng rồi mới push/deploy lên production.** Tài liệu này là quy trình
đầy đủ.

Bạn sẽ có 2 thứ chạy ở máy:
- **Directus local** (Docker) ở `http://localhost:8155` — bản sao cấu trúc của prod.
- **Next.js local** ở `http://localhost:3100` — website đọc từ Directus local.

> Compassscribe dùng dải port **31xx/81xx** để chạy SONG SONG với dự án AgeWell
> (giữ 30xx/80xx). Đừng đổi về 3000/8055 — frontend sẽ nối nhầm vào CMS AgeWell.

Production (`cms.compassscribe.com`, `compassscribe.com`) **không bị đụng tới**
trong suốt quá trình test.

## ⚡ Cách nhanh nhất: skill `/run-local`

Trong Claude Code, gõ **`/run-local`** — nó tự up Docker, seed đầy đủ (nếu DB trống),
chạy frontend :3100 và verify mọi route sạch. Quy trình thủ công bên dưới chỉ cần
khi muốn làm từng bước tay. Tương đương 1 lệnh:
```powershell
npm run cms:up; npm run db:up
$env:DIRECTUS_EMAIL="admin@compassscribe.com"; $env:DIRECTUS_PASSWORD="<local-pw>"
npm run cms:seed:local   # = node backend/cms/run-local-seed.mjs (seed full, đúng thứ tự)
npm run dev              # frontend :3100
```

---

## Chuẩn bị (làm 1 lần)

1. **Docker Desktop** đang chạy (đã cài sẵn).
2. File `backend/cms/.env` tồn tại (đã có). Đây là cấu hình Directus local.
3. File `.env.local` ở gốc dự án có dòng `NEXT_PUBLIC_CMS_BASE=http://localhost:8155`
   (đã set). Nếu chưa, copy từ `.env.example`.

---

## Quy trình mỗi lần phát triển

### Bước 1 — Bật Directus local
```powershell
npm run cms:up
```
Đợi ~30 giây. Mở `http://localhost:8155`, đăng nhập bằng `ADMIN_EMAIL` /
`ADMIN_PASSWORD` trong `backend/cms/.env`.

### Bước 2 — Kéo cấu trúc thật từ production về (1 lần, hoặc khi prod đổi schema)
Bước này copy **cấu trúc** (collection/field/quan hệ) từ prod, KHÔNG copy nội
dung. Cần token/đăng nhập admin **production**:
```powershell
$env:SRC_URL="https://cms.compassscribe.com"
$env:SRC_EMAIL="admin@compassscribe.com"
$env:SRC_PASSWORD="<mat-khau-prod>"
npm run cms:snapshot:prod
```
→ tạo file `backend/cms/snapshot.json` (không commit).

### Bước 3 — Áp cấu trúc đó vào Directus local
Cần đăng nhập admin **local** (trong `backend/cms/.env`):
```powershell
$env:DST_URL="http://localhost:8155"
$env:DST_EMAIL="admin@compassscribe.com"
$env:DST_PASSWORD="<mat-khau-local trong backend/cms/.env>"
npm run cms:apply:local
```
→ Directus local giờ có cấu trúc giống hệt prod (kể cả pages/posts/team_members
và các quan hệ ảnh).

> Lưu ý: `/schema` của Directus **không** chuyển quyền đọc Public. Bước 4 (seed
> bằng setup script) sẽ tự cấp lại quyền Public ở local.

### Bước 4 — Tạo nội dung mẫu ở local
```powershell
$env:DIRECTUS_URL="http://localhost:8155"
$env:DIRECTUS_EMAIL="admin@compassscribe.com"
$env:DIRECTUS_PASSWORD="<mat-khau-local>"
npm run cms:seed:local
```
Chạy orchestrator `run-local-seed.mjs`: nếu DB trống nó tự lo **đúng thứ tự** —
schema → tạo `languages` (vi-VN/en-US) → homepage → cấp quyền **Public** →
team/blog/team-members → webhook revalidate **trỏ `localhost:3100`**. `cms:seed:local`
tự đặt `DIRECTUS_URL=localhost:8155`, `SITE_URL=localhost:3100`,
`REVALIDATE_SECRET=local-revalidate-secret` — bạn chỉ cần cung cấp email/mật khẩu.
Idempotent: chạy lại trên DB đã seed thì bỏ qua việc nặng. (Bước 2-3 snapshot/apply
schema vẫn để riêng cho khi prod đổi schema; run-local-seed cũng tự gọi nếu có `SRC_*`.)

### Bước 5 — Chạy website local
```powershell
npm run dev
```
Mở:
- `http://localhost:3100/vi` — trang chủ
- `http://localhost:3100/vi/team` — lưới đội ngũ
- `http://localhost:3100/vi/blog` — blog

Tất cả đọc từ **Directus local**. Sửa nội dung trong Studio local
(`localhost:8155`) → tải lại trang để thấy thay đổi.

#### Vì sao có trang cập nhật ngay, có trang phải đợi?
- **Trang chủ** đọc mới mỗi lần (force-dynamic) → sửa xong F5 là thấy ngay.
- **Team / Blog** được **cache** (tối ưu tốc độ). Chỉ cập nhật khi Directus gửi
  tín hiệu "revalidate" qua **webhook** → `/api/revalidate`. Đó là lý do webhook
  local PHẢI trỏ `localhost:3100` (việc seed ở Bước 4 đã lo).
- Nếu sửa Team/Blog mà không thấy đổi: kiểm tra webhook local có trỏ đúng
  localhost không (Studio → Settings → Flows → mở operation → URL phải là
  `http://localhost:3100/api/revalidate?...`). Hoặc restart `npm run dev` để xoá
  cache trong bộ nhớ. `secret` của webhook phải khớp `REVALIDATE_SECRET` trong
  `.env.local`, nếu lệch → trả 401, không cập nhật.
- Webhook chạy khi item **cha** thay đổi. Sửa trong **Studio** và bấm **Save**
  (cách BD dùng) luôn kích hoạt đúng. (Chỉ khi can thiệp API thẳng vào bảng dịch
  con mới không trigger — không liên quan thao tác thường ngày.)

### Bước 6 — Khi mọi thứ chạy đúng ở local → mới lên production
Theo đúng GitOps như cũ:
1. Tạo nhánh feature, commit thay đổi code.
2. Mở PR → CI chạy (lint/build + terraform plan) → review → merge.
3. Code tự deploy. Nếu cần chạy setup script lên prod (tạo collection mới…), chỉ
   chạy **sau khi** đã verify y hệt ở local — và trỏ `DIRECTUS_URL` vào prod.

---

## Dọn dẹp / làm lại từ đầu
```powershell
npm run cms:down        # tắt Directus local, GIỮ dữ liệu
# hoặc xoá sạch để test lại từ trắng:
docker compose -f backend/cms/docker-compose.cms.yml down -v
```

---

## Quy tắc vàng
- ❌ KHÔNG chạy setup script / sửa schema thẳng trên production khi chưa test local.
- ✅ Local trước → verify → PR → deploy.
- Secret local (`local-...` trong `backend/cms/.env`) KHÁC secret prod — không trộn.
- `snapshot.json` chỉ là cấu trúc, không chứa nội dung/PII; vẫn không commit.

## Liên quan
- `backend/cms/README.md` — chi tiết stack CMS.
- `docs/TEAM-PAGE.md` — trang Đội ngũ + Team Members.
- `docs/CMS-MIGRATION.md` — bối cảnh kiến trúc CMS.
