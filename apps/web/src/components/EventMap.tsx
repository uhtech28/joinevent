'use client';

// EventMap — zero-cost Leaflet + OpenStreetMap mini-map for an event location.
//
// Implementation notes:
//   - Uses Leaflet's vanilla JS API (loaded from a CDN) so we don't need to add
//     `leaflet` + `react-leaflet` to package.json. This keeps the bundle small.
//   - Tiles are OpenStreetMap (free, no API key). Attribution is required by
//     OSM's license — rendered into the map's bottom-right by Leaflet itself.
//   - SSR-safe: all work happens inside useEffect.

import { useEffect, useRef } from 'react';

// We declare just the pieces of the Leaflet global we use so the file
// compiles without `@types/leaflet`.
type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
};
type LeafletGlobal = {
  map: (
    el: HTMLElement,
    opts?: { scrollWheelZoom?: boolean; zoomControl?: boolean },
  ) => LeafletMap;
  tileLayer: (
    url: string,
    opts: { attribution: string; maxZoom?: number },
  ) => { addTo: (m: LeafletMap) => void };
  marker: (latlng: [number, number]) => {
    addTo: (m: LeafletMap) => { bindPopup: (s: string) => unknown };
  };
  Icon: {
    Default: {
      mergeOptions: (opts: Record<string, string>) => void;
      prototype: { _getIconUrl?: () => string };
    };
  };
};

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Marker icon assets — fetched from the same CDN, so we don't ship them.
const ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const ICON_RETINA_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const ICON_SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let leafletScriptPromise: Promise<LeafletGlobal> | null = null;

// One-time loader that injects the Leaflet CSS + JS bundle from a CDN.
function loadLeaflet(): Promise<LeafletGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'));
  }
  if ((window as unknown as { L?: LeafletGlobal }).L) {
    return Promise.resolve((window as unknown as { L: LeafletGlobal }).L);
  }
  if (leafletScriptPromise) return leafletScriptPromise;

  // Inject CSS first (idempotent)
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  leafletScriptPromise = new Promise<LeafletGlobal>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${LEAFLET_JS}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () =>
        resolve((window as unknown as { L: LeafletGlobal }).L),
      );
      existing.addEventListener('error', () => reject(new Error('leaflet load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve((window as unknown as { L: LeafletGlobal }).L);
    script.onerror = () => reject(new Error('leaflet load failed'));
    document.head.appendChild(script);
  });
  return leafletScriptPromise;
}

export function EventMap({
  latitude,
  longitude,
  label,
  zoom = 15,
  className,
}: {
  latitude: number;
  longitude: number;
  label?: string;
  zoom?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        // Leaflet's default marker bundles icon paths via require() which Next
        // can't resolve from a CDN script. Patch the prototype so it uses the
        // CDN URLs directly.
        const proto = L.Icon.Default.prototype as { _getIconUrl?: () => string };
        if (proto._getIconUrl) delete proto._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: ICON_URL,
          iconRetinaUrl: ICON_RETINA_URL,
          shadowUrl: ICON_SHADOW_URL,
        });

        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        }).setView([latitude, longitude], zoom);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([latitude, longitude]).addTo(map);
        if (label) marker.bindPopup(label);
      })
      .catch(() => {
        // If the CDN is unreachable, the container stays empty — caller can
        // render a fallback if needed. We don't throw.
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, label, zoom]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        'h-64 w-full overflow-hidden rounded-2xl border border-black/10 bg-cream-100'
      }
      role="region"
      aria-label="Event location map"
    />
  );
}
