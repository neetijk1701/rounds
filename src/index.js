// Rounds sync relay.
// Stores ONLY ciphertext. Encryption keys never reach this server: they live in the
// pairing code, which travels device-to-device in the URL #fragment (never sent over HTTP).
// The server sees: a random vault id, an encrypted blob, a revision number, timestamps.
import { DurableObject } from "cloudflare:workers";

const MAX_BLOB = 1_500_000;            // ~1.5 MB of base64 ciphertext
const EXPIRE_MS = 30 * 24 * 3600e3;    // vault self-deletes after 30 days untouched

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/api\/v\/([0-9a-f]{64})$/);
    if (url.pathname.startsWith("/api/")) {
      if (!m) return json({ error: "not found" }, 404);
      if (!["GET", "PUT", "DELETE"].includes(req.method)) return json({ error: "method" }, 405);
      const stub = env.VAULT.get(env.VAULT.idFromName(m[1]));
      return stub.fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

export class Vault extends DurableObject {
  async fetch(req) {
    const s = this.ctx.storage;
    if (await s.get("wiped")) return json({ wiped: true }, 410);
    const rev = (await s.get("rev")) || 0;

    if (req.method === "GET") {
      const q = new URL(req.url).searchParams;
      if (q.has("check")) return json({ rev });
      const since = q.get("since");
      if (since !== null && Number(since) === rev) return json({ rev, same: true });
      const blob = await s.get("blob");
      return json({ rev, blob: blob || null });
    }

    if (req.method === "PUT") {
      const text = await req.text();
      if (text.length > MAX_BLOB + 200) return json({ error: "too large" }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: "bad json" }, 400); }
      if (typeof body.blob !== "string" || typeof body.baseRev !== "number") return json({ error: "bad body" }, 400);
      if (body.baseRev !== rev) return json({ conflict: true, rev }, 409);
      const next = rev + 1;
      await s.put({ rev: next, blob: body.blob });
      await s.setAlarm(Date.now() + EXPIRE_MS);
      return json({ rev: next });
    }

    if (req.method === "DELETE") {
      await s.deleteAll();
      // Leave a marker so other paired devices learn they should erase their copies too.
      await s.put("wiped", Date.now());
      await s.setAlarm(Date.now() + EXPIRE_MS);
      return json({ wiped: true });
    }
    return json({ error: "method" }, 405);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
