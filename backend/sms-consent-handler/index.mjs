/* ============================================================
   COMPASSSCRIBE — SMS consent handler (AWS Lambda)
   Triggered by API Gateway (HTTP API) on POST /api/sms-consent.

   Stores a durable, auditable opt-in record for Twilio toll-free SMS
   verification (error 30513). Twilio reviewers may ask for proof that
   consent was collected, so we persist: who consented (name, phone), the
   EXACT consent text shown, when (timestamp), and from where (IP + user
   agent) — to DynamoDB (Fargate disk is ephemeral, a file would be lost).

   - Validates name + phone (US format)
   - Requires the consent checkbox (consent === true)
   - Rejects bot submissions via honeypot
   - Captures source IP + user agent from the API Gateway event
   ============================================================ */
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.SMS_CONSENT_TABLE;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// DYNAMODB_ENDPOINT lets local dev point at DynamoDB Local. Unset in
// production, so the SDK uses the real AWS endpoint.
const DDB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || undefined;
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, endpoint: DDB_ENDPOINT })
);

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const reply = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

function digits(s) {
  return (String(s || "").match(/\d/g) || []).length;
}

export async function handler(event) {
  const method =
    event?.requestContext?.http?.method || event?.httpMethod || "POST";

  if (method === "OPTIONS") {
    return reply(204, {});
  }
  if (method !== "POST") {
    return reply(405, { error: "Method not allowed" });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Invalid JSON" });
  }

  // Honeypot — silently accept so bots think they succeeded, but store nothing.
  if (data.company && String(data.company).trim() !== "") {
    return reply(200, { ok: true });
  }

  const name = String(data.name || "").trim().slice(0, 200);
  const phone = String(data.phone || "").trim().slice(0, 40);
  const consent = data.consent === true;
  const consentText = String(data.consentText || "").trim().slice(0, 2000);
  const consentVersion = String(data.consentVersion || "v1").slice(0, 20);

  if (name.length < 2) {
    return reply(422, { error: "name_required" });
  }
  // US phone: 10 digits, or 11 with a leading country code (1).
  const d = digits(phone);
  if (d < 10 || d > 11) {
    return reply(422, { error: "phone_invalid" });
  }
  if (!consent) {
    return reply(422, { error: "consent_required" });
  }

  // Capture audit metadata from the API Gateway event (lead-handler omits these).
  const headers = event?.headers || {};
  const ipAddress =
    event?.requestContext?.http?.sourceIp ||
    event?.requestContext?.identity?.sourceIp ||
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent =
    headers["user-agent"] || headers["User-Agent"] || "unknown";

  const record = {
    consentId: randomUUID(),
    name,
    phone,
    consent,
    consentText,
    consentVersion,
    ipAddress,
    userAgent,
    source: "sms-consent-page",
    createdAt: new Date().toISOString(),
  };

  if (!TABLE) {
    console.error("SMS_CONSENT_TABLE not configured");
    return reply(500, { error: "server_misconfigured" });
  }

  try {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: record }));
  } catch (err) {
    console.error("DynamoDB put failed", err);
    return reply(500, { error: "store_failed" });
  }

  return reply(200, { ok: true, consentId: record.consentId });
}
