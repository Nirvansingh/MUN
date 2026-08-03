"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentState } from "@/lib/use-persistent-state";

const SW_URL = "/sw";
const OFFLINE_KEY = "mun_offline";
const CACHE_NAME = "mun-offline-v3";

type OfflineStatus = "idle" | "enabling" | "ready" | "unsupported" | "error";

export default function OfflineToggle() {
  const [offline, setOffline] = usePersistentState<boolean>(OFFLINE_KEY, false);
  const [status, setStatus] = useState<OfflineStatus>("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);
  const initRef = useRef(false);
  // `navigator` doesn't exist on the server, so `supported` must only be
  // computed after hydration — otherwise the button would render a different
  // label on server vs client, breaking hydration (React error #418).
  const [mounted, setMounted] = useState(false);
  const supported =
    mounted && typeof navigator !== "undefined" && "serviceWorker" in navigator;

  // Count what's currently in the offline cache (pages + assets).
  const countCached = useCallback(async (): Promise<number> => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      setCachedCount(keys.length);
      return keys.length;
    } catch {
      setCachedCount(0);
      return 0;
    }
  }, []);

  // Resolve with the cached-entry count once the SW reports the precache
  // finished. Falls back to reading the cache directly after a timeout so
  // the UI never hangs even if the message is missed.
  const waitForPrecache = useCallback(
    (timeoutMs = 60000) =>
      new Promise<number>((resolve) => {
        let settled = false;
        const finish = (count: number) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener("message", handler);
          setCachedCount(count);
          resolve(count);
        };
        const handler = (e: MessageEvent) => {
          if (e.data && e.data.type === "MUN_PRECACHE_DONE") {
            finish(typeof e.data.count === "number" ? e.data.count : 0);
          }
        };
        navigator.serviceWorker.addEventListener("message", handler);
        const timer = setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", handler);
          void countCached().then((n) => {
            if (!settled) {
              settled = true;
              setCachedCount(n);
              resolve(n);
            }
          });
        }, timeoutMs);
      }),
    [countCached]
  );

  async function enableOffline() {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    setStatus("enabling");
    try {
      // Register (idempotent if already registered) and wait for the active
      // worker, then ask it to (re)precache everything and report back.
      // Start listening for the MUN_PRECACHE_DONE reply BEFORE sending the
      // trigger so the response can't race past our listener (this matters
      // when offline, where the precache fails fast and replies immediately).
      await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      const reg = await navigator.serviceWorker.ready;
      const countPromise = waitForPrecache();
      reg.active?.postMessage({ type: "MUN_PRECACHE" });
      const count = await countPromise;
      setOffline(true);
      setStatus("ready");
      setCachedCount(count);
    } catch {
      setStatus("error");
      setOffline(false);
    }
  }

  async function disableOffline() {
    setOffline(false);
    setStatus("idle");
    try {
      const reg = await navigator.serviceWorker
        .getRegistration(SW_URL)
        .catch(() => undefined);
      await reg?.unregister();
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      setCachedCount(0);
    } catch {
      /* ignore cleanup errors */
    }
  }

  // Mark mounted after hydration so `supported` becomes true (see above).
  // Deferring the update avoids a synchronous state change during the effect.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // On mount: restore persisted preference (auto re-register + precache).
  useEffect(() => {
    if (!mounted || !supported) return;
    if (initRef.current) return;
    initRef.current = true;
    const syncOnline = () => setIsOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);

    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data && e.data.type === "MUN_CONNECTIVITY") {
        setIsOnline(e.data.online);
      }
    });

    void (async () => {
      // If offline mode was enabled previously, restore it (register + precache).
      // Read localStorage directly: the `offline` state may still hold the
      // server-snapshot value (false) during the initial client effect run.
      let wasEnabled = false;
      try {
        wasEnabled = window.localStorage.getItem(OFFLINE_KEY) === "true";
      } catch {
        /* ignore */
      }
      if (wasEnabled) {
        await enableOffline();
      } else {
        const reg = await navigator.serviceWorker
          .getRegistration(SW_URL)
          .catch(() => undefined);
        if (reg?.active) {
          // SW exists but the user hasn't opted into offline mode — reflect
          // the ready state anyway (content may already be cached).
          setStatus("ready");
          await countCached();
        } else {
          setStatus("idle");
        }
      }
    })();

    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, supported]);

  const handleClick = () => {
    if (status === "ready" || offline) {
      void disableOffline();
    } else if (status === "idle" || status === "error") {
      void enableOffline();
    }
  };

  const ready = status === "ready";

  let label = "Offline";
  if (!supported) {
    label = "Offline N/A";
  } else if (status === "enabling") {
    label = "Downloading…";
  } else if (ready) {
    label = cachedCount > 0 ? `Offline · ${cachedCount} saved` : "Offline Ready";
  }

  const title = !supported
    ? "Offline mode not supported in this browser"
    : ready
      ? isOnline
        ? "Offline mode on — all content saved. Click to disable."
        : "You are offline — reading from saved content. Click to disable."
      : "Enable offline mode — save all research content for use without internet.";

  return (
    <button
      className={`btn offline-btn${ready ? " offline-on" : ""}${
        !isOnline ? " offline-live" : ""
      }`}
      onClick={handleClick}
      disabled={status === "enabling" || !supported}
      aria-pressed={ready}
      title={title}
    >
      <span className="offline-dot" aria-hidden="true" />
      {label}
      {ready && !isOnline ? <span className="offline-status"> ·</span> : null}
    </button>
  );
}
