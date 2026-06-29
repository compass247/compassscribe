/* ============================================================
   SMS consent backend — DynamoDB table + Lambda + a route on the
   EXISTING HTTP API Gateway (api.compassscribe.com). Stores Twilio
   toll-free opt-in consent records for audit (error 30513).

   Mirrors the lead pipeline in backend.tf but is fully separate from it
   (own table, own Lambda, own IAM) and reuses aws_apigatewayv2_api.lead
   so no new domain/cert is needed — just an extra "POST /api/sms-consent"
   route on the same API.
   ============================================================ */

# ---------------- DynamoDB ----------------
# Schema from the SAME file local dev uses, so the two never drift.
locals {
  sms_consent_schema = jsondecode(file("${path.module}/../backend/sms-consent-handler/table-schema.json"))
}

resource "aws_dynamodb_table" "sms_consent" {
  name         = "${var.project}-sms-consent"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = local.sms_consent_schema.hashKey
  range_key    = try(local.sms_consent_schema.rangeKey, null)

  dynamic "attribute" {
    for_each = local.sms_consent_schema.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  dynamic "global_secondary_index" {
    for_each = try(local.sms_consent_schema.globalSecondaryIndexes, [])
    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hashKey
      range_key       = try(global_secondary_index.value.rangeKey, null)
      projection_type = try(global_secondary_index.value.projection, "ALL")
    }
  }

  # Consent is an audit record — protect against accidental loss.
  point_in_time_recovery {
    enabled = true
  }
}

# ---------------- Lambda role ----------------
resource "aws_iam_role" "sms_consent_lambda" {
  name = "${var.project}-sms-consent-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "sms_consent_lambda_logs" {
  role       = aws_iam_role.sms_consent_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "sms_consent_lambda_app" {
  name = "${var.project}-sms-consent-lambda-app"
  role = aws_iam_role.sms_consent_lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.sms_consent.arn
      }
    ]
  })
}

# ---------------- Lambda package ----------------
# CI runs `npm install --omit=dev` in backend/sms-consent-handler before apply.
data "archive_file" "sms_consent_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/sms-consent-handler"
  output_path = "${path.module}/build/sms-consent-handler.zip"
}

resource "aws_lambda_function" "sms_consent" {
  function_name    = "${var.project}-sms-consent-handler"
  role             = aws_iam_role.sms_consent_lambda.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.sms_consent_handler.output_path
  source_code_hash = data.archive_file.sms_consent_handler.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      SMS_CONSENT_TABLE = aws_dynamodb_table.sms_consent.name
      ALLOWED_ORIGIN    = "https://${var.domain}"
    }
  }
}

# ---------------- Route on the existing HTTP API ----------------
resource "aws_apigatewayv2_integration" "sms_consent" {
  api_id                 = aws_apigatewayv2_api.lead.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.sms_consent.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "sms_consent" {
  api_id    = aws_apigatewayv2_api.lead.id
  route_key = "POST /api/sms-consent"
  target    = "integrations/${aws_apigatewayv2_integration.sms_consent.id}"
}

resource "aws_lambda_permission" "sms_consent_apigw" {
  statement_id  = "AllowAPIGatewayInvokeSmsConsent"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sms_consent.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.lead.execution_arn}/*/*"
}
