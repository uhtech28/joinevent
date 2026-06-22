// Seed script — populates the DB with realistic NCR data for development.
// Run: pnpm prisma:seed (from apps/api/)
// Safe to re-run; uses upserts so it won't create duplicates.
//
// Step 4: also ensures the PostGIS `geo` column exists on `events`
// (a GENERATED ALWAYS column derived from latitude/longitude), plus the GIST
// index. Both statements are idempotent — re-running the seed is safe.

import { Prisma, PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ---------- helpers ----------
const addDays = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const setHours = (date: Date, h: number, m = 0) => {
  const d = new Date(date);
  d.setUTCHours(h - 5, m - 30, 0, 0); // IST = UTC + 5:30, so 17:00 IST = 11:30 UTC
  return d;
};
const ev = (day: number, hour: number, durationH: number) => {
  const start = setHours(addDays(day), hour);
  const end = new Date(start.getTime() + durationH * 60 * 60 * 1000);
  return { startsAt: start, endsAt: end };
};

// ============================================================
// PostGIS: ensure the geography column + GIST index exist.
// Done as raw SQL because Prisma doesn't natively model
// GENERATED ALWAYS AS columns. Idempotent via IF NOT EXISTS.
// ============================================================
async function ensurePostgisGeoColumn() {
  await db.$executeRawUnsafe(`
    ALTER TABLE "events"
      ADD COLUMN IF NOT EXISTS "geo" geography(Point, 4326)
      GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint("longitude"::float8, "latitude"::float8), 4326)::geography
      ) STORED;
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_events_geo" ON "events" USING GIST ("geo");
  `);
}

// Step 6b: forbid negative balance on a user/business wallet. The
// platform-house wallet is allowed to go negative because it represents
// PSP-held funds during dev. Re-running is safe — we check pg_constraint.
async function ensureWalletCheckConstraint() {
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'wallets_balance_non_negative'
      ) THEN
        ALTER TABLE "wallets"
          ADD CONSTRAINT "wallets_balance_non_negative"
          CHECK (balance_paise >= 0 OR owner_type = 'platform');
      END IF;
    END $$;
  `);
}

// ---------- societies (4 NCR cities) ----------
const societies = [
  {
    slug: 'noida-sector-76',
    name: 'Sector 76, Noida',
    city: 'Noida',
    type: 'sector',
    centroidLat: 28.5731,
    centroidLng: 77.371,
    reputationScore: 84.5,
  },
  {
    slug: 'gurugram-dlf-phase-3',
    name: 'DLF Phase 3, Gurugram',
    city: 'Gurugram',
    type: 'gated',
    centroidLat: 28.496,
    centroidLng: 77.088,
    reputationScore: 88.1,
  },
  {
    slug: 'ghaziabad-crossings-republik',
    name: 'Crossings Republik, Ghaziabad',
    city: 'Ghaziabad',
    type: 'gated',
    centroidLat: 28.632,
    centroidLng: 77.422,
    reputationScore: 79.3,
  },
  {
    slug: 'faridabad-sector-21',
    name: 'Sector 21, Faridabad',
    city: 'Faridabad',
    type: 'sector',
    centroidLat: 28.4089,
    centroidLng: 77.3178,
    reputationScore: 76.8,
  },
];

// ---------- organisers ----------
const organisers = [
  {
    phone: '+919000000001',
    username: 'green-acres-rwa',
    displayName: 'Green Acres RWA',
    city: 'Noida',
    bio: 'The official events team for Sector 76 — Diwali, Holi, Navratri, kids carnivals.',
    societySlug: 'noida-sector-76',
  },
  {
    phone: '+919000000002',
    username: 'dlf-phase3-events',
    displayName: 'DLF Phase 3 Events',
    city: 'Gurugram',
    bio: 'Resident-run events committee, DLF Phase 3.',
    societySlug: 'gurugram-dlf-phase-3',
  },
  {
    phone: '+919000000003',
    username: 'crossings-collective',
    displayName: 'Crossings Collective',
    city: 'Ghaziabad',
    bio: 'Weekend markets, exhibitions, food trails — Crossings Republik.',
    societySlug: 'ghaziabad-crossings-republik',
  },
  {
    phone: '+919000000004',
    username: 'faridabad-fest',
    displayName: 'Faridabad Fest',
    city: 'Faridabad',
    bio: 'Bringing community events to Faridabad sectors.',
    societySlug: 'faridabad-sector-21',
  },
];

// ---------- 10 events with real cover images ----------
type EventSeed = {
  slug: string;
  title: string;
  description: string;
  organiserUsername: string;
  societySlug: string;
  latitude: number;
  longitude: number;
  addressText: string;
  capacity: number;
  daysFromNow: number;
  startHour: number;
  durationHours: number;
  coverImage: string;
  metadata: Record<string, unknown>;
  stalls: Array<{
    category: string;
    pricePaise: number;
    available: number;
    facilities?: Record<string, unknown>;
  }>;
};

const COVER = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const events: EventSeed[] = [
  {
    slug: 'sector-76-weekend-bazaar',
    title: 'Sector 76 Weekend Bazaar',
    description:
      'Food, fashion, and home-decor stalls right outside Green Acres tower. Live music after 6pm.',
    organiserUsername: 'green-acres-rwa',
    societySlug: 'noida-sector-76',
    latitude: 28.5731,
    longitude: 77.371,
    addressText: 'Green Acres Common Area, Sector 76, Noida',
    capacity: 600,
    daysFromNow: 2,
    startHour: 17,
    durationHours: 5,
    coverImage: COVER('photo-1533174072545-7a4b6ad7a6c3'),
    metadata: { tags: ['family', 'food', 'live-music'], familyFriendly: true },
    stalls: [
      { category: 'food', pricePaise: 120000, available: 6, facilities: { power: true, water: true } },
      { category: 'home-decor', pricePaise: 80000, available: 4 },
      { category: 'fashion', pricePaise: 100000, available: 4 },
    ],
  },
  {
    slug: 'dlf-phase3-art-fair',
    title: 'DLF Phase 3 Art Fair',
    description: 'A curated weekend art fair featuring local artists, prints, and workshops.',
    organiserUsername: 'dlf-phase3-events',
    societySlug: 'gurugram-dlf-phase-3',
    latitude: 28.496,
    longitude: 77.088,
    addressText: 'Central Park, DLF Phase 3, Gurugram',
    capacity: 800,
    daysFromNow: 5,
    startHour: 11,
    durationHours: 8,
    coverImage: COVER('photo-1499781350541-7783f6c6a0c8'),
    metadata: { tags: ['art', 'workshops'], familyFriendly: true },
    stalls: [
      { category: 'art', pricePaise: 150000, available: 8, facilities: { table: true, chairs: 2 } },
      { category: 'books', pricePaise: 70000, available: 5 },
      { category: 'food', pricePaise: 130000, available: 4 },
    ],
  },
  {
    slug: 'crossings-food-trail',
    title: 'Crossings Food Trail',
    description: 'A 3-day food trail across Crossings Republik with 30+ home-chef stalls.',
    organiserUsername: 'crossings-collective',
    societySlug: 'ghaziabad-crossings-republik',
    latitude: 28.632,
    longitude: 77.422,
    addressText: 'Block A Plaza, Crossings Republik, Ghaziabad',
    capacity: 1200,
    daysFromNow: 7,
    startHour: 17,
    durationHours: 6,
    coverImage: COVER('photo-1555939594-58d7cb561ad1'),
    metadata: { tags: ['food', 'home-chefs'], familyFriendly: true },
    stalls: [
      { category: 'food', pricePaise: 200000, available: 12, facilities: { power: true, water: true } },
      { category: 'services', pricePaise: 90000, available: 3 },
    ],
  },
  {
    slug: 'faridabad-21-kids-carnival',
    title: 'Sector 21 Kids Carnival',
    description: 'A Saturday carnival with bouncy castles, kid-friendly food, and craft stalls.',
    organiserUsername: 'faridabad-fest',
    societySlug: 'faridabad-sector-21',
    latitude: 28.4089,
    longitude: 77.3178,
    addressText: 'Community Hall, Sector 21, Faridabad',
    capacity: 400,
    daysFromNow: 9,
    startHour: 14,
    durationHours: 6,
    coverImage: COVER('photo-1528605248644-14dd04022da1'),
    metadata: { tags: ['kids', 'family'], familyFriendly: true },
    stalls: [
      { category: 'kids', pricePaise: 80000, available: 6 },
      { category: 'food', pricePaise: 100000, available: 4 },
    ],
  },
  {
    slug: 'sector-76-diwali-mela',
    title: 'Sector 76 Diwali Mela',
    description:
      'The annual Diwali mela — diyas, sweets, fashion, and home-decor under one roof for 2 days.',
    organiserUsername: 'green-acres-rwa',
    societySlug: 'noida-sector-76',
    latitude: 28.5731,
    longitude: 77.371,
    addressText: 'Central Lawn, Sector 76, Noida',
    capacity: 1500,
    daysFromNow: 14,
    startHour: 16,
    durationHours: 6,
    coverImage: COVER('photo-1604871086269-6c8ba6f73330'),
    metadata: { tags: ['diwali', 'festival', 'family'], familyFriendly: true },
    stalls: [
      { category: 'home-decor', pricePaise: 250000, available: 10, facilities: { power: true } },
      { category: 'food', pricePaise: 200000, available: 8 },
      { category: 'fashion', pricePaise: 180000, available: 6 },
      { category: 'art', pricePaise: 150000, available: 4 },
    ],
  },
  {
    slug: 'dlf-phase3-fitness-meetup',
    title: 'DLF Phase 3 Fitness Meetup',
    description: 'Outdoor yoga + zumba + bootcamp + healthy food stalls. Bring your mat.',
    organiserUsername: 'dlf-phase3-events',
    societySlug: 'gurugram-dlf-phase-3',
    latitude: 28.496,
    longitude: 77.088,
    addressText: 'Phase 3 Green, Gurugram',
    capacity: 250,
    daysFromNow: 12,
    startHour: 6,
    durationHours: 3,
    coverImage: COVER('photo-1518611012118-696072aa579a'),
    metadata: { tags: ['fitness', 'wellness'], familyFriendly: true },
    stalls: [
      { category: 'fitness', pricePaise: 60000, available: 3 },
      { category: 'food', pricePaise: 80000, available: 3 },
    ],
  },
  {
    slug: 'crossings-book-fair',
    title: 'Crossings Book Fair',
    description: 'Pre-loved books, indie publishers, kids reading corner, author meet at 5pm.',
    organiserUsername: 'crossings-collective',
    societySlug: 'ghaziabad-crossings-republik',
    latitude: 28.632,
    longitude: 77.422,
    addressText: 'Crossings Club, Ghaziabad',
    capacity: 350,
    daysFromNow: 18,
    startHour: 11,
    durationHours: 7,
    coverImage: COVER('photo-1524995997946-a1c2e315a42f'),
    metadata: { tags: ['books', 'kids', 'authors'], familyFriendly: true },
    stalls: [
      { category: 'books', pricePaise: 100000, available: 12 },
      { category: 'food', pricePaise: 90000, available: 3 },
    ],
  },
  {
    slug: 'faridabad-21-navratri-night',
    title: 'Sector 21 Navratri Night',
    description: 'Traditional dandiya night with live dhol and 20+ stalls.',
    organiserUsername: 'faridabad-fest',
    societySlug: 'faridabad-sector-21',
    latitude: 28.4089,
    longitude: 77.3178,
    addressText: 'Sector 21 Open Ground, Faridabad',
    capacity: 1000,
    daysFromNow: 21,
    startHour: 19,
    durationHours: 4,
    coverImage: COVER('photo-1514525253161-7a46d19cd819'),
    metadata: { tags: ['navratri', 'festival', 'dance'], familyFriendly: true },
    stalls: [
      { category: 'food', pricePaise: 150000, available: 10 },
      { category: 'fashion', pricePaise: 130000, available: 6 },
      { category: 'home-decor', pricePaise: 100000, available: 4 },
    ],
  },
  {
    slug: 'sector-76-candle-bazaar',
    title: 'Sector 76 Candle & Craft Bazaar',
    description: 'Handmade candles, soaps, journals, and craft kits. Pre-Diwali shopping.',
    organiserUsername: 'green-acres-rwa',
    societySlug: 'noida-sector-76',
    latitude: 28.5731,
    longitude: 77.371,
    addressText: 'Pocket B Lobby, Sector 76, Noida',
    capacity: 300,
    daysFromNow: 25,
    startHour: 11,
    durationHours: 6,
    coverImage: COVER('photo-1602874801007-bd3c47d48a02'),
    metadata: { tags: ['craft', 'home-decor', 'gifts'], familyFriendly: true },
    stalls: [
      { category: 'home-decor', pricePaise: 90000, available: 8 },
      { category: 'art', pricePaise: 80000, available: 4 },
    ],
  },
  {
    slug: 'dlf-phase3-winter-market',
    title: 'DLF Phase 3 Winter Market',
    description: 'Hot chocolate, sweaters, candles, gifts — full winter vibes.',
    organiserUsername: 'dlf-phase3-events',
    societySlug: 'gurugram-dlf-phase-3',
    latitude: 28.496,
    longitude: 77.088,
    addressText: 'Phase 3 Plaza, Gurugram',
    capacity: 700,
    daysFromNow: 28,
    startHour: 16,
    durationHours: 6,
    coverImage: COVER('photo-1511795409834-ef04bbd61622'),
    metadata: { tags: ['winter', 'gifts'], familyFriendly: true },
    stalls: [
      { category: 'fashion', pricePaise: 200000, available: 8 },
      { category: 'home-decor', pricePaise: 180000, available: 6 },
      { category: 'food', pricePaise: 150000, available: 6 },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Join Events database...');

  await ensurePostgisGeoColumn();
  console.log('  ✓ PostGIS geo column + GIST index ready');

  await ensureWalletCheckConstraint();
  console.log('  ✓ wallets_balance_non_negative CHECK ready');

  // --- Societies ---
  for (const s of societies) {
    await db.society.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }
  console.log(`  ✓ ${societies.length} societies`);

  // --- Users + Business Profiles (organisers) ---
  // Step 8: the FIRST organiser's user is also our seed admin so the admin
  //         panel has a real account to sign in with.
  for (const o of organisers) {
    const isFirst = o === organisers[0];
    const user = await db.user.upsert({
      where: { phoneE164: o.phone },
      update: {
        primaryRole: 'organiser',
        isVerified: true,
        city: o.city,
        ...(isFirst ? { isAdmin: true } : {}),
      },
      create: {
        phoneE164: o.phone,
        authProvider: 'otp',
        primaryRole: 'organiser',
        isVerified: true,
        city: o.city,
        ...(isFirst ? { isAdmin: true } : {}),
      },
    });
    await db.businessProfile.upsert({
      where: { username: o.username },
      update: {
        displayName: o.displayName,
        bio: o.bio,
      },
      create: {
        userId: user.id,
        username: o.username,
        displayName: o.displayName,
        type: 'organiser',
        bio: o.bio,
        verified: true,
        kycStatus: 'approved',
        followersCount: Math.floor(Math.random() * 800) + 200,
        avgRating: Math.round((4.2 + Math.random() * 0.7) * 100) / 100,
      },
    });
  }
  console.log(`  ✓ ${organisers.length} users + business profiles`);

  // Step 8: leave one organiser profile as kycStatus='pending' so the admin
  // KYC queue isn't empty in dev. Re-seed flips it back to pending each time.
  await db.businessProfile.update({
    where: { username: 'green-acres-rwa' },
    data: { kycStatus: 'pending', verified: false },
  });
  console.log(`  ✓ left @green-acres-rwa as KYC pending for admin testing`);
  console.log(`  ✓ promoted ${organisers[0].phone} to admin (isAdmin=true)`);

  // --- Events + Stalls ---
  for (const e of events) {
    const organiser = await db.businessProfile.findUnique({
      where: { username: e.organiserUsername },
    });
    const society = await db.society.findUnique({ where: { slug: e.societySlug } });
    if (!organiser || !society) continue;

    const { startsAt, endsAt } = ev(e.daysFromNow, e.startHour, e.durationHours);

    const event = await db.event.upsert({
      where: { slug: e.slug },
      update: {
        startsAt,
        endsAt,
        status: 'live',
        coverImages: [e.coverImage],
      },
      create: {
        organiserId: organiser.id,
        societyId: society.id,
        slug: e.slug,
        title: e.title,
        description: e.description,
        coverImages: [e.coverImage],
        startsAt,
        endsAt,
        latitude: e.latitude,
        longitude: e.longitude,
        addressText: e.addressText,
        capacity: e.capacity,
        status: 'live',
        metadata: e.metadata as Prisma.InputJsonValue,
      },
    });

    await db.stall.deleteMany({ where: { eventId: event.id } });
    for (const stall of e.stalls) {
      await db.stall.create({
        data: {
          eventId: event.id,
          category: stall.category,
          pricePaise: stall.pricePaise,
          available: stall.available,
          booked: 0,
          facilities: (stall.facilities ?? {}) as Prisma.InputJsonValue,
        },
      });
    }
  }
  console.log(`  ✓ ${events.length} events with stalls + covers`);

  // Update events_count on each society
  for (const s of societies) {
    const count = await db.event.count({ where: { society: { slug: s.slug } } });
    await db.society.update({ where: { slug: s.slug }, data: { eventsCount: count } });
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
