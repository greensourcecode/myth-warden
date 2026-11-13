// Myth Warden's service worker (the owner's 53, 2026-11-11): the browser keeps the game's files, so a visit after the
// first starts at once and the zones seen before load with no connection.
// One cache a build: "myth-warden-" + BUILD (tools/publish.lua writes the build's id here as it publishes). A new
// build's worker takes over at once (skipWaiting, claim) and the page reloads once to be served by it
// (web/engine_template.html), so a page never runs one build's files with another's. The page itself is asked of
// the network first (the newest; the cache if there's no connection), every other file of the cache first.
const BUILD = "a10f01592e73";
const CACHE = "myth-warden-" + BUILD;

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key.startsWith("myth-warden-") && key !== CACHE) {
                await caches.delete(key);
            }
        }
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
        return;
    }
    if (request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    (await caches.open(CACHE)).put(request, response.clone());
                }
                return response;
            } catch (problem) {
                return (await caches.match(request)) || Response.error();
            }
        })());
        return;
    }
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const kept = await cache.match(request);
        if (kept) {
            return kept;
        }
        const response = await fetch(request);
        if (response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone());
        }
        return response;
    })());
});
