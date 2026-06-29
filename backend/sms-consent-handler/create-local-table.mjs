/* ============================================================
   Creates the SMS consent table in DynamoDB Local from the shared
   schema (table-schema.json) — the SAME definition production uses
   (infra/backend.tf), so local can never drift from live.
   Idempotent — skips if the table already exists.
   Run:  npm run db:init   (from backend/sms-consent-handler)
   ============================================================ */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(__dirname, "table-schema.json"), "utf8"));

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://localhost:8100";
const TABLE = process.env.SMS_CONSENT_TABLE || schema.tableName;

const ddb = new DynamoDBClient({
  region: "us-east-1",
  endpoint: ENDPOINT,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

const input = {
  TableName: TABLE,
  BillingMode: "PAY_PER_REQUEST",
  AttributeDefinitions: schema.attributes.map((a) => ({
    AttributeName: a.name,
    AttributeType: a.type,
  })),
  KeySchema: [{ AttributeName: schema.hashKey, KeyType: "HASH" }],
};
if (schema.rangeKey) {
  input.KeySchema.push({ AttributeName: schema.rangeKey, KeyType: "RANGE" });
}
if (schema.globalSecondaryIndexes?.length) {
  input.GlobalSecondaryIndexes = schema.globalSecondaryIndexes.map((gsi) => ({
    IndexName: gsi.name,
    KeySchema: [
      { AttributeName: gsi.hashKey, KeyType: "HASH" },
      ...(gsi.rangeKey ? [{ AttributeName: gsi.rangeKey, KeyType: "RANGE" }] : []),
    ],
    Projection: { ProjectionType: gsi.projection || "ALL" },
  }));
}

try {
  await ddb.send(new DescribeTableCommand({ TableName: TABLE }));
  console.log(`Table "${TABLE}" already exists at ${ENDPOINT} — nothing to do.`);
} catch {
  await ddb.send(new CreateTableCommand(input));
  console.log(`Created table "${TABLE}" at ${ENDPOINT}.`);
}
