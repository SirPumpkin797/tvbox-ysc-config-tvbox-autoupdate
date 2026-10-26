// Cloudflare Worker: latest TVBox subscriptions from GitHub Contents API.
// Set WORKER_URL by deploying this Worker; no GitHub token needed for a public repository.
const OWNER = "SirPumpkin797";
const REPO = "tvbox-ysc-config-tvbox-autoupdate";
const FILES = new Set(["feimao","wangerxiao","laoliubei","xiaoma","ouge","4k","xiaohezi","shiguang","tinghao"]);
const NO_CACHE = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, no-cache, max-age=0, must-revalidate",
  "pragma": "no-cache",
  "expires": "0",
  "access-control-allow-origin": "*"
};
async function githubJson(file) {
  const path = "output/" + file;
  // Unique URL prevents stale edge responses for the mutable main branch.
  const api = "https://api.github.com/repos/" + OWNER + "/" + REPO +
    "/contents/" + path.split("/").map(encodeURIComponent).join("/") +
    "?ref=main&nocache=" + crypto.randomUUID();
  const response = await fetch(api, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "tvbox-subscription-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      "Cache-Control": "no-cache"
    },
    cf: { cacheTtl: 0 }
  });
  if (!response.ok) throw new Error("GitHub API " + response.status);
  const payload = await response.json();
  if (payload.encoding !== "base64" || !payload.content) throw new Error("Invalid GitHub API response");
  const binary = atob(payload.content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    try {
      if (path === "/" || path === "/multi" || path === "/多仓订阅.json") {
        const multi = await githubJson("多仓订阅.json");
        if (!Array.isArray(multi.urls)) throw new Error("Invalid depot list");
        // Retain upstream order and names. Resolve known generated files through the Worker.
        multi.urls = multi.urls.map(entry => {
          if (!entry || typeof entry.url !== "string") return entry;
          try {
            const original = new URL(entry.url);
            const match = original.pathname.match(/\/output\/([a-z0-9]+)\.json$/);
            if (match && FILES.has(match[1])) return { ...entry, url: url.origin + "/config/" + match[1] };
          } catch (_) {}
          return entry;
        });
        return new Response(JSON.stringify(multi), { headers: NO_CACHE });
      }
      const match = path.match(/^\/config\/([a-z0-9]+)$/);
      if (match && FILES.has(match[1])) {
        const config = await githubJson(match[1] + ".json");
        return new Response(JSON.stringify(config), { headers: NO_CACHE });
      }
      return new Response(JSON.stringify({error:"Not found"}), {status:404,headers:NO_CACHE});
    } catch (error) {
      return new Response(JSON.stringify({error: String(error.message || error)}), {status:502,headers:NO_CACHE});
    }
  }
};
