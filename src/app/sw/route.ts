import { getAllFiles } from "@/lib/files";

// Pre-render the service worker at build time so the route list (which is
// derived from the filesystem) is baked in — the data/ folder isn't available
// inside the Vercel serverless function at request time.
export const dynamic = "force-static";

// Build the complete list of statically-generated routes so the service
// worker can precache every page (all content is baked into HTML at build).
const APP_SHELL_ROUTES = ["/", "/search", "/committee/unhrc", "/committee/unsc"];

function buildRouteList(): string[] {
  const files = getAllFiles();
  const globalRoutes = files
    .filter((f) => f.committee === "Global Reference")
    .map((f) => {
      const slug = f.name
        .replace(/\.txt$/i, "")
        .toLowerCase()
        .replace(/\s+/g, "-");
      return `/global/${slug}`;
    });
  return [...new Set([...APP_SHELL_ROUTES, ...globalRoutes])];
}

const SW_SOURCE = `/* MUN Research Hub service worker — generated at build time. */
const CACHE_VERSION = "mun-offline-v1";
const PRECACHE_ROUTES = __PRECACHE_ROUTES__;

async function precacheAll() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.allSettled(
    PRECACHE_ROUTES.map(async (url) => {
      // Full HTML page.
      await cache.add(url).catch(() => {});
      // RSC payload so client-side navigation also works offline.
      const rscReq = new Request(url, { headers: { RSC: "1" } });
      try {
        const res = await fetch(rscReq);
        if (res && res.ok) await cache.put(rscReq, res.clone());
      } catch {
        /* ignore */
      }
    })
  );
  const count = (await cache.keys()).length;
  self.clients.matchAll().then((clients) =>
    clients.forEach((client) => client.postMessage({ type: "MUN_PRECACHE_DONE", count }))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await precacheAll();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Online indicator: post connectivity to any client.
self.addEventListener("online", () => broadcastStatus());
self.addEventListener("offline", () => broadcastStatus());

function broadcastStatus() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage({ type: "MUN_CONNECTIVITY", online: navigator.onLine }));
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to precached copy (offline support).
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Fall back to the home page so the app shell still renders.
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  // Static assets (hashed JS/CSS) + images: cache-first with background refresh.
  if (url.pathname.startsWith("/_next/static/") || /\\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })());
    return;
  }

  // Same-origin GETs (RSC payloads for client-side navigation, etc.):
  // network-first with a cache fallback so in-app navigation keeps working
  // offline after the route was visited at least once.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      // Next.js RSC navigation requests carry a ?_rsc=<hash> query — match the
      // precached copy by pathname, ignoring the search string.
      const isRsc = req.headers.get("RSC") === "1";
      const matchOpts = isRsc ? { ignoreSearch: true } : {};
      const cached = await cache.match(req, matchOpts);
      if (cached) return cached;
      const page = await cache.match(url.pathname);
      if (page) return page;
      return Response.error();
    }
  })());
});

// Allow the client to trigger a fresh precache after a content update.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "MUN_SKIP_WAITING") {
    self.skipWaiting();
  }
  if (data.type === "MUN_PRECACHE") {
    event.waitUntil(precacheAll());
  }
});
`;

export async function GET() {
  const routes = buildRouteList();
  const source = SW_SOURCE.replace(
    "__PRECACHE_ROUTES__",
    JSON.stringify(routes)
  );

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
