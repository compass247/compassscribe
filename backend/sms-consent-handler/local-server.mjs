/* ============================================================
   COMPASSSCRIBE — Local dev server for the SMS consent handler.
   Wraps the Lambda handler in a plain HTTP server so the consent
   form works at http://localhost:8788/api/sms-consent, exactly like
   the API Gateway → Lambda path in production.

   Run:  npm run dev   (from backend/sms-consent-handler)
   Needs DynamoDB Local running (see backend/docker-compose.local.yml)
   and the table created via `npm run db:init`.
   ============================================================ */
import http from "node:http";
import { handler } from "./index.mjs";

const PORT = process.env.PORT || 8788;

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  // Build an API-Gateway-v2-shaped event for the handler. Pass through the
  // socket IP as sourceIp so the audit record captures something locally.
  const body = await readBody(req);
  const event = {
    requestContext: {
      http: {
        method: req.method,
        sourceIp: req.socket?.remoteAddress || "127.0.0.1",
      },
    },
    headers: req.headers,
    body,
  };

  let result;
  try {
    result = await handler(event);
  } catch (err) {
    console.error("handler threw", err);
    result = { statusCode: 500, headers: {}, body: JSON.stringify({ error: "server_error" }) };
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const headers = result.headers || {};
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.statusCode = result.statusCode || 200;
  res.end(result.body || "");
});

server.listen(PORT, () => {
  console.log(`SMS consent API (local) → http://localhost:${PORT}/api/sms-consent`);
  console.log(`DynamoDB endpoint: ${process.env.DYNAMODB_ENDPOINT || "(AWS default)"}`);
  console.log(`Consent table: ${process.env.SMS_CONSENT_TABLE || "(unset)"}`);
});
