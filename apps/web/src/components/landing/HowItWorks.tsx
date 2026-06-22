import { SectionTitle } from './SectionTitle';

const STEPS = [
  {
    n: 1,
    title: 'Create Profile',
    body: 'Organizer or stall owner creates a simple profile with business details.',
  },
  {
    n: 2,
    title: 'Post / Discover Event',
    body: 'Organizers post events. Vendors discover nearby stall opportunities.',
  },
  {
    n: 3,
    title: 'Apply For Stall',
    body: 'Vendors apply with category, products and contact details.',
  },
  {
    n: 4,
    title: 'Confirm Booking',
    body: 'Organizer confirms vendor and manages booking records easily.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-[5%] py-[88px] sm:px-[7%]">
      <SectionTitle
        eyebrow="How It Works"
        title="Simple process for both sides"
        description="JoinEvents will make the event-stall connection fast, clear and professional."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <article
            key={s.n}
            className="rounded-3xl border border-black/5 bg-white p-7 shadow-card"
          >
            <div className="mb-4 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-brand-orange text-base font-extrabold text-white">
              {s.n}
            </div>
            <h3 className="mb-2 text-lg font-bold text-ink-700">{s.title}</h3>
            <p className="text-sm leading-[1.65] text-ink-300">{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
