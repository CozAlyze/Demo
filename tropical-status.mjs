/* TS2A: CORS for the CozAlyze Demo (exact origin, never *). The writer and job layer are unchanged. */
import { prodDeps, json, env } from "../../deps.mjs";
import { handleStatus } from "../../jobs.mjs";
function corsHeaders(req){
  const allowed = String(env("ALLOWED_ORIGINS") || "https://cozalyze.github.io").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  const origin = req.headers.get("origin");
  const h = { "Vary": "Origin" };
  if (origin && allowed.indexOf(origin) >= 0) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "authorization, content-type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}
function withCors(req, res){ const h = corsHeaders(req); Object.keys(h).forEach(function (k) { res.headers.set(k, h[k]); }); return res; }
export default async function (req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "GET") return withCors(req, json(405, { error: "GET only" }));
  const job = new URL(req.url).searchParams.get("job");
  const r = await handleStatus(prodDeps(req), req.headers.get("authorization"), job);
  return withCors(req, json(r.status, r.body));
}
