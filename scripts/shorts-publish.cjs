/**
 * Publishes the videos rendered by scripts/shorts-video.cjs as Reels on the "CertsQuests" Facebook page and
 * Instagram @certquets (same secrets as social-weekly: FB_ACCESS_TOKEN = page token, FB_PAGE_ID, IG_USER_ID).
 *
 *   node scripts/shorts-publish.cjs --dir shorts-out [--dry-run] [--only fb|ig] [--fb-video <id>] [--allow-silent]
 *   node scripts/shorts-publish.cjs --check          # token rights only, nothing is published
 *
 * Direct file upload (Graph API resumable upload): no public URL to host. Caption: the
 * "Instagram Reels / Facebook" section of each video's .txt. Not published: a video whose link did not answer
 * 200 at render time (manifest.linkOk = false), a video without voice (unless --allow-silent), and on
 * Facebook a video longer than 90 s (Reels API limit). Locally .env.local is read if present.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const GRAPH = "https://graph.facebook.com/v21.0";
const args = process.argv.slice(2);
const arg = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = args.includes("--dry-run");
const ONLY = arg("only");

if (fs.existsSync(path.join(ROOT, ".env.local"))) {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const token = process.env.FB_ACCESS_TOKEN || "";
const page = process.env.FB_PAGE_ID || "";
const ig = process.env.IG_USER_ID || "";

async function graph(p, params, method = "POST") {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = method === "GET" ? await fetch(`${GRAPH}/${p}?${body}`) : await fetch(`${GRAPH}/${p}`, { method, body });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`Graph ${p}: ${JSON.stringify(j.error || j).slice(0, 400)}`);
  return j;
}

async function upload(url, file) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(fs.statSync(file).size) },
    body: fs.readFileSync(file),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`upload ${res.status}: ${JSON.stringify(j).slice(0, 300)}`);
}

let lastFbVideo = arg("fb-video") || null;

async function facebookReel(file, caption) {
  const start = await graph(`${page}/video_reels`, { upload_phase: "start" });
  await upload(start.upload_url || `https://rupload.facebook.com/video-upload/v21.0/${start.video_id}`, file);
  await graph(`${page}/video_reels`, { upload_phase: "finish", video_id: start.video_id, video_state: "PUBLISHED", description: caption });
  lastFbVideo = start.video_id;
  return `https://www.facebook.com/reel/${start.video_id}`;
}

// Public URL of the video hosted by Facebook (fallback source for Instagram).
async function fbVideoSource(id) {
  for (let i = 0; i < 60; i++) {
    const v = await graph(id, { fields: "source,status" }, "GET").catch(() => ({}));
    if (v.source) return v.source;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Facebook video ${id}: source never became available`);
}

async function igWait(id) {
  for (let i = 0; i < 72; i++) {
    const s = await graph(id, { fields: "status_code,status" }, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram rejected the video: ${s.status}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Instagram: processing took too long");
}

async function instagramReel(file, caption) {
  let id;
  try {
    const c = await graph(`${ig}/media`, { media_type: "REELS", upload_type: "resumable", caption, share_to_feed: "true", thumb_offset: "1500" });
    await upload(c.uri || `https://rupload.facebook.com/ig-api-upload/v21.0/${c.id}`, file);
    await igWait(c.id);
    id = c.id;
  } catch (e) {
    // On the sister project (2026-11-26) the direct upload answered 400 ProcessingFailedError: fall back on the
    // video already published on Facebook.
    if (!lastFbVideo) throw e;
    console.warn(`Instagram direct upload refused (${String(e).slice(0, 120)}): falling back on Facebook video ${lastFbVideo}`);
    const c = await graph(`${ig}/media`, { media_type: "REELS", video_url: await fbVideoSource(lastFbVideo), caption, share_to_feed: "true", thumb_offset: "1500" });
    await igWait(c.id);
    id = c.id;
  }
  const m = await graph(`${ig}/media_publish`, { creation_id: id });
  const info = await graph(m.id, { fields: "permalink" }, "GET");
  return info.permalink;
}

function caption(txt) {
  const m = txt.split("=== Instagram Reels / Facebook ===")[1];
  return (m || txt).trim().slice(0, 2150);
}

const summary = (s) => {
  console.log(s);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n");
};

async function main() {
  if (!token || !page || !ig) throw new Error("FB_ACCESS_TOKEN, FB_PAGE_ID and IG_USER_ID are required");
  if (args.includes("--check")) {
    const p = await graph(page, { fields: "name,id" }, "GET");
    const a = await graph(ig, { fields: "username,id" }, "GET");
    summary(`Token OK: page "${p.name}" (${p.id}), Instagram @${a.username} (${a.id})`);
    return;
  }
  const dir = path.resolve(arg("dir") || "shorts-out");
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  let failures = 0;
  for (const v of manifest) {
    const file = path.join(dir, v.file);
    const cap = caption(fs.readFileSync(file.replace(/\.mp4$/, ".txt"), "utf8"));
    if (!v.linkOk) {
      summary(`⏭ ${v.file}: link ${v.link} not verified at render time, not published`);
      continue;
    }
    if (!v.voice && !args.includes("--allow-silent")) {
      summary(`⏭ ${v.file}: rendered without voice, not published`);
      failures++;
      continue;
    }
    if (DRY) {
      summary(`dry-run ${v.file} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${v.seconds} s)\n\n${cap}\n`);
      continue;
    }
    summary(`## ${v.title}`);
    for (const [key, name, fn] of [["fb", "Facebook", facebookReel], ["ig", "Instagram", instagramReel]]) {
      if (ONLY && ONLY !== key) continue;
      if (key === "fb" && v.seconds > 90) {
        summary(`- Facebook: skipped (${v.seconds} s, Reels API limit is 90 s)`);
        continue;
      }
      try {
        summary(`- ${name}: ${await fn(file, cap)}`);
      } catch (e) {
        failures++;
        summary(`- ${name}: FAILED ${String(e).slice(0, 400)}`);
      }
    }
  }
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
