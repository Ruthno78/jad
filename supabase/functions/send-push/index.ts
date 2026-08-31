// JADSTACK LOTTO — Edge Function: send-push
// Deklanche pa trigger SQL jl43_trg_notify_push apre chak INSERT nan
// jl43_notifications. Voye yon push FCM (HTTP v1) bay tout aparèy Android
// itilizatè a genyen anrejistre nan jl43_device_tokens.
//
// Sekrè ki dwe konfigire (Supabase Dashboard > Edge Functions > send-push > Secrets):
//   SEND_PUSH_WEBHOOK_SECRET   -> menm valè ak jl43_push_config.webhook_secret
//   FCM_SERVICE_ACCOUNT_JSON   -> kontni konplè fichye service-account.json Firebase la
// SUPABASE_URL ak SUPABASE_SERVICE_ROLE_KEY otomatikman disponib nan edge functions.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("SEND_PUSH_WEBHOOK_SECRET") ?? "";
const SERVICE_ACCOUNT_RAW = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") ?? "";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc(header)}.${enc(claims)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth token error: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3000) };
  return cachedToken.token;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (!SERVICE_ACCOUNT_RAW) {
      return new Response(JSON.stringify({ skipped: "FCM_SERVICE_ACCOUNT_JSON pa konfigire" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { user_id, title, body, link, type } = payload as {
      user_id: string; title: string; body: string; link: string | null; type: string | null;
    };
    if (!user_id) return new Response("Missing user_id", { status: 400 });

    const sa = JSON.parse(SERVICE_ACCOUNT_RAW);
    const projectId = sa.project_id;

    const { data: tokens, error: tokErr } = await sb
      .from("jl43_device_tokens")
      .select("id, token")
      .eq("user_id", user_id);
    if (tokErr) throw tokErr;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_device_tokens" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { count: unread } = await sb
      .from("jl43_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .is("read_at", null);

    const accessToken = await getAccessToken(sa);
    const invalidIds: string[] = [];
    let sent = 0;

    for (const row of tokens) {
      const message = {
        message: {
          token: row.token,
          notification: { title: title || "JADSTACK LOTTO", body: body || "" },
          data: {
            link: link || "",
            type: type || "system",
            badge: String(unread ?? 0),
          },
          android: {
            priority: "high",
            notification: {
              channel_id: "jl_default",
              notification_count: unread ?? 0,
            },
          },
        },
      };
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        },
      );
      if (res.ok) {
        sent++;
      } else {
        const errText = await res.text();
        if (errText.includes("UNREGISTERED") || errText.includes("INVALID_ARGUMENT") || errText.includes("NOT_FOUND")) {
          invalidIds.push(row.id);
        }
      }
    }

    if (invalidIds.length) {
      await sb.from("jl43_device_tokens").delete().in("id", invalidIds);
    }

    return new Response(JSON.stringify({ sent, removed_invalid: invalidIds.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
