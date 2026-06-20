# Hướng dẫn dựng Compassscribe trên AWS account mới (từng bước)

Tài liệu này hướng dẫn deploy toàn bộ stack (web Next.js + lead form serverless + CMS Directus)
cho **compassscribe.com** lên một **AWS account mới**, repo GitHub **compass247/compassscribe**,
project prefix **`cmas`**.

> Quy ước:
> - Mọi lệnh `aws` đều dùng **profile `cmas`** (account mới), tránh nhầm account cũ.
> - Chạy lệnh trong **PowerShell** tại thư mục `D:\DEV\Compassscribe`.
> - Chỗ nào có `REPLACE_...` hoặc `<...>` là bạn phải tự điền.

---

## Giai đoạn A — Tạo AWS account mới + CLI profile

### A1. Tạo account (trên web)
1. https://signup.aws.amazon.com/ → tạo account mới (email RIÊNG, khác account cũ).
2. Account name gợi ý: `compassscribe-prod`. Nhập thẻ, xác minh phone, chọn **Basic Support (Free)**.
3. Đăng nhập console bằng **root user**.

### A2. Tạo IAM user cho CLI (KHÔNG dùng root để chạy CLI)
Trong Console account mới → **IAM** → **Users** → **Create user**:
1. User name: `cmas-admin` → Next.
2. **Attach policies directly** → tick **AdministratorAccess** → Next → Create user.
3. Mở user `cmas-admin` → **Security credentials** → **Create access key** → **Command Line Interface (CLI)**
   → Create → **lưu Access Key ID + Secret** (chỉ hiện 1 lần).

### A3. Tạo AWS CLI profile `cmas`
```powershell
aws configure --profile cmas
#   AWS Access Key ID     -> <access key của cmas-admin>
#   AWS Secret Access Key -> <secret>
#   Default region name   -> us-east-1
#   Default output format -> json
```
Kiểm tra (Account ID phải KHÁC 381492229787):
```powershell
aws sts get-caller-identity --profile cmas
```

---

## Giai đoạn B — Tạo repo GitHub mới + push code

Code đã sẵn ở `D:\DEV\Compassscribe` (nhánh `setup/aws-config`, đã commit). Tạo repo trên org compass247:

```powershell
Set-Location D:\DEV\Compassscribe
git checkout main
git merge setup/aws-config --ff-only          # đưa cấu hình vào main
gh repo create compass247/compassscribe --private --source=. --remote=origin --push
```
Kiểm tra: `gh repo view compass247/compassscribe --web` (mở trên trình duyệt).

> Nếu `gh` báo không có quyền tạo repo trong org compass247: vào GitHub org → Settings → cấp quyền,
> hoặc tạo repo trống trên web rồi `git remote add origin ... ; git push -u origin main`.

---

## Giai đoạn C — Cloudflare cho compassscribe.com

1. Đăng ký domain `compassscribe.com` (nếu chưa có) tại nhà đăng ký bất kỳ.
2. Vào https://dash.cloudflare.com → **Add a site** → nhập `compassscribe.com` → chọn Free plan.
3. Cloudflare cho bạn **2 nameserver** → vào nhà đăng ký domain, đổi nameserver sang 2 cái đó.
   Chờ Cloudflare xác nhận "Active" (vài phút–vài giờ).
4. Lấy **Zone ID**: trong trang domain trên Cloudflare → tab **Overview** → cột phải, mục **Zone ID** → copy.
5. Tạo **API token**: My Profile → **API Tokens** → **Create Token** → template **Edit zone DNS**
   → Zone Resources: chọn `compassscribe.com` → Create → **copy token** (chỉ hiện 1 lần).

Ghi lại 2 giá trị: `ZONE_ID` và `CLOUDFLARE_TOKEN`.

---

## Giai đoạn D — Bootstrap Terraform state (account mới, chạy 1 lần)

```powershell
$env:AWS_PROFILE = "cmas"
$REGION = "us-east-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$BUCKET = "cmas-tfstate-$ACCOUNT_ID"
"State bucket = $BUCKET"

# S3 bucket cho terraform state
aws s3api create-bucket --bucket $BUCKET --region $REGION
aws s3api put-bucket-versioning --bucket $BUCKET --versioning-configuration Status=Enabled

# DynamoDB lock table
aws dynamodb create-table `
  --table-name cmas-tf-lock `
  --attribute-definitions AttributeName=LockID,AttributeType=S `
  --key-schema AttributeName=LockID,KeyType=HASH `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION
```

---

## Giai đoạn E — Điền terraform.tfvars + verify SES

### E1. Sửa `infra/terraform.tfvars` (file này gitignore, không commit)
Mở `D:\DEV\Compassscribe\infra\terraform.tfvars`, điền:
- `cloudflare_zone_id = "<ZONE_ID>"`
- `github_repo = "compass247/compassscribe"`
- (tuỳ chọn) `ses_from`, `ses_to` — để rỗng `""` nếu CHƯA cần email.

### E2. Verify SES sender (bỏ qua nếu để ses_from rỗng)
```powershell
$env:AWS_PROFILE = "cmas"
aws ses verify-email-identity --email-address "no-reply@compassscribe.com" --region us-east-1
# Mở hộp thư no-reply@compassscribe.com, bấm link xác nhận.
```
> Lưu ý: nếu chưa có mailbox cho domain, tạm để `ses_from=""`/`ses_to=""` — lead vẫn lưu DynamoDB.

---

## Giai đoạn F — Terraform init + apply (lần đầu, từ local)

```powershell
$env:AWS_PROFILE = "cmas"
$env:TF_VAR_cloudflare_api_token = "<CLOUDFLARE_TOKEN>"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

# Cài deps production cho 2 Lambda (Terraform zip chúng lúc apply)
Push-Location backend\lead-handler; npm ci --omit=dev; Pop-Location
Push-Location backend\lead-sync;    npm ci --omit=dev; Pop-Location

Set-Location infra
terraform init `
  -backend-config="bucket=cmas-tfstate-$ACCOUNT_ID" `
  -backend-config="region=us-east-1" `
  -backend-config="dynamodb_table=cmas-tf-lock"

terraform plan -out tf.plan      # XEM KỸ output: phải toàn là "create", không có "destroy"
terraform apply tf.plan
terraform output                 # ghi lại các giá trị cho Giai đoạn G
Set-Location ..
```
> ACM validation (qua Cloudflare DNS) mất vài phút. ECS lần đầu start với image rỗng → bình thường,
> CI sẽ push image thật ở Giai đoạn G.

---

## Giai đoạn G — Set GitHub Secrets/Variables + deploy

Lấy giá trị từ `terraform output` (chạy trong `infra/` với `$env:AWS_PROFILE="cmas"`):

```powershell
Set-Location D:\DEV\Compassscribe\infra
$env:AWS_PROFILE = "cmas"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$ROLE_ARN = (terraform output -raw github_deploy_role_arn)
$REPO = "compass247/compassscribe"

# --- Secrets ---
gh secret set AWS_DEPLOY_ROLE_ARN --repo $REPO --body "$ROLE_ARN"
gh secret set CLOUDFLARE_API_TOKEN --repo $REPO --body "$env:TF_VAR_cloudflare_api_token"
gh secret set TF_STATE_BUCKET --repo $REPO --body "cmas-tfstate-$ACCOUNT_ID"

# --- Variables ---
gh variable set AWS_REGION        --repo $REPO --body "us-east-1"
gh variable set ECR_REPOSITORY    --repo $REPO --body "cmas-web"
gh variable set ECS_CLUSTER       --repo $REPO --body "cmas"
gh variable set ECS_SERVICE       --repo $REPO --body "cmas-web"
gh variable set LEAD_LAMBDA_NAME  --repo $REPO --body "cmas-lead-handler"
gh variable set CLOUDFLARE_ZONE_ID --repo $REPO --body "<ZONE_ID>"
gh variable set API_BASE          --repo $REPO --body "https://api.compassscribe.com"
gh variable set CMS_BASE          --repo $REPO --body "https://cms.compassscribe.com"
gh variable set SITE_URL          --repo $REPO --body "https://compassscribe.com"
Set-Location ..
```
> Đối chiếu tên output thật: chạy `terraform output` xem có đúng `github_deploy_role_arn`, `ecr_repository_url`...
> Nếu CI dùng tên ECR đầy đủ (`...amazonaws.com/cmas-web`) thì set `ECR_REPOSITORY` theo output.

Trigger deploy: code đã ở `main` → CI deploy.yml chạy khi push. Nếu muốn chạy lại:
```powershell
gh workflow run deploy.yml --repo compass247/compassscribe --ref main
gh run watch --repo compass247/compassscribe
```

---

## Giai đoạn H — Bootstrap Directus CMS

```powershell
$env:AWS_PROFILE = "cmas"
# 1. Lấy admin password ban đầu
aws secretsmanager get-secret-value --secret-id cmas-cms `
  --query SecretString --output text --region us-east-1
```
2. Mở `https://cms.compassscribe.com` → đăng nhập `admin@compassscribe.com` + password trên → **đổi password ngay**.
3. Tạo schema/collections — chọn 1 cách:
   - **Sync từ CMS AgeWell cũ** (giữ cấu trúc): xem `docs/LOCAL-DEV.md` phần `schema-sync.mjs`.
   - **Tạo mới** bằng seed:
     ```powershell
     $env:DIRECTUS_URL = "https://cms.compassscribe.com"
     $env:DIRECTUS_TOKEN = "<static-token-admin>"
     $env:REVALIDATE_SECRET = "<lấy từ Secrets Manager cmas-cms>"
     node backend/cms/setup-team-page.mjs
     node backend/cms/setup-blog.mjs
     node backend/cms/setup-team-members.mjs
     node backend/cms/seed-homepage.mjs
     ```
4. Tạo **service user cho lead-sync**: Directus → Users → tạo user, role có quyền create/update collection
   `leads` → tạo **static token**.
5. Nạp token vào Terraform để bật lead-sync Lambda:
   ```powershell
   $env:AWS_PROFILE = "cmas"
   $env:TF_VAR_cloudflare_api_token = "<CLOUDFLARE_TOKEN>"
   $env:TF_VAR_directus_sync_token = "<static-token-lead-sync>"
   Set-Location infra; terraform apply; Set-Location ..
   ```

---

## Giai đoạn I — Kiểm thử end-to-end

```powershell
# Web sống chưa
curl.exe -s -o NUL -w "%{http_code}`n" https://compassscribe.com/healthz   # mong đợi 200

# Lead API
curl.exe -X POST https://api.compassscribe.com/api/lead `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test\",\"phone\":\"4085551234\"}'                          # {"ok":true,...}

# DynamoDB có nhận lead không
$env:AWS_PROFILE = "cmas"
aws dynamodb scan --table-name cmas-leads --region us-east-1
```
Mở trình duyệt `https://compassscribe.com/vi` và `/en`. Submit form thật. Sửa 1 nội dung trong Directus →
publish → xem trang có cập nhật (webhook revalidate).

---

## Sự cố thường gặp

- **Deploy nhầm account cũ** → luôn set `$env:AWS_PROFILE="cmas"` trước lệnh aws/terraform; kiểm
  `aws sts get-caller-identity` ra Account ID mới.
- **GitHub Actions không assume được role** → `github_repo` trong tfvars phải đúng `compass247/compassscribe`.
- **ACM cứ "pending validation"** → kiểm Cloudflare zone đã Active + DNS-only (grey cloud), token đúng quyền.
- **next/image lỗi domain** → đã set `cms.compassscribe.com` trong `next.config.mjs` (đã làm sẵn).
- **CMS mất dữ liệu khi redeploy** → Directus pin `:11.3.5`, data ở EBS volume riêng; đừng đổi `:latest`.
