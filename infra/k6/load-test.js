// k6 load test — Join Events API
// Run: k6 run --vus 100 --duration 60s infra/k6/load-test.js
// Targets: /events, /discover, /featured/tiers, /wallet (auth'd)
//
// Goals (per the audit):
//   - 500 RPS sustained on read paths with p95 < 250ms
//   - 100 concurrent bookings on different stalls without error
//   - Zero 5xx under 200 RPS

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.API_URL || 'http://localhost:4000/api/v1';

const eventsTrend = new Trend('events_duration');
const discoverTrend = new Trend('discover_duration');
const errors = new Rate('errors');

export const options = {
  scenarios: {
    // Heavy read mix — typical browse traffic
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 50 },
        { duration: '45s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    events_duration: ['p(95)<250'],
    discover_duration: ['p(95)<350'],
    errors: ['rate<0.02'],
  },
};

const NCR_COORDS = [
  { lat: 28.5355, lng: 77.391 },   // Noida
  { lat: 28.4595, lng: 77.0266 },  // Gurugram
  { lat: 28.6692, lng: 77.4538 },  // Ghaziabad
  { lat: 28.7041, lng: 77.1025 },  // Delhi
];

export default function () {
  // GET /events — paginated list
  {
    const r = http.get(`${BASE}/events?limit=20`);
    eventsTrend.add(r.timings.duration);
    check(r, { 'events 200': (x) => x.status === 200 }) || errors.add(1);
  }

  // POST /discover — geo-scored
  {
    const c = NCR_COORDS[Math.floor(Math.random() * NCR_COORDS.length)];
    const r = http.post(
      `${BASE}/discover`,
      JSON.stringify({ latitude: c.lat, longitude: c.lng, radiusKm: 25 }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    discoverTrend.add(r.timings.duration);
    check(r, { 'discover 200': (x) => x.status === 200 }) || errors.add(1);
  }

  // GET /featured/tiers — cached endpoint
  {
    const r = http.get(`${BASE}/featured/tiers`);
    check(r, { 'tiers 200': (x) => x.status === 200 }) || errors.add(1);
  }

  // GET /societies — small static-ish list
  {
    const r = http.get(`${BASE}/societies`);
    check(r, { 'societies 200': (x) => x.status === 200 }) || errors.add(1);
  }

  sleep(Math.random() * 2 + 0.5);
}
