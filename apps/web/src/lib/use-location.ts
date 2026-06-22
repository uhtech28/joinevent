'use client';

// useLocation — small hook around the browser Geolocation API.
//
// Behaviour:
//   - status='idle'        → before we've tried; default coords are NCR center
//   - status='loading'     → permission prompt is up
//   - status='granted'     → coords are real
//   - status='denied'      → user said no; coords fall back to NCR center
//   - status='unavailable' → no Geolocation API (e.g. http context, very old browser)
//
// We never auto-request location on mount — that's a hostile pattern. The
// /events page renders a "Use my location" button that calls request().

import { useCallback, useState } from 'react';

// Sector 18 Noida — a sensible fallback for NCR.
export const DEFAULT_COORDS = { lat: 28.5665, lng: 77.3211 };

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

export type LocationState = {
  status: LocationStatus;
  lat: number;
  lng: number;
  /** Friendly error message when status is denied/unavailable. */
  error: string | null;
  /** Accuracy in metres if known. */
  accuracyM: number | null;
};

export type UseLocation = LocationState & {
  request: () => void;
  reset: () => void;
};

const initial: LocationState = {
  status: 'idle',
  lat: DEFAULT_COORDS.lat,
  lng: DEFAULT_COORDS.lng,
  error: null,
  accuracyM: null,
};

export function useLocation(): UseLocation {
  const [state, setState] = useState<LocationState>(initial);

  const request = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unavailable', error: 'Geolocation not supported in this browser' }));
      return;
    }
    setState((s) => ({ ...s, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'granted',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          error: null,
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState((s) => ({
          ...s,
          status: denied ? 'denied' : 'unavailable',
          error: denied
            ? 'Location permission denied — showing NCR-center results instead.'
            : 'Could not read your location — showing NCR-center results instead.',
        }));
      },
      { maximumAge: 60_000, timeout: 8_000, enableHighAccuracy: false },
    );
  }, []);

  const reset = useCallback(() => setState(initial), []);

  return { ...state, request, reset };
}

/** Formats a distance in metres into "1.2 km" / "420 m". */
export function formatDistance(distanceM: number): string {
  if (distanceM < 950) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(distanceM < 9500 ? 1 : 0)} km`;
}
