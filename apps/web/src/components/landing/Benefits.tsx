import { SectionTitle } from './SectionTitle';

const ORGANIZER_POINTS = [
  'Post your event and reach interested stall vendors faster.',
  'Manage booked and available stalls from one dashboard.',
  'Create a verified vendor network for future events.',
  'Reduce fake confirmations and last-minute empty stalls.',
  'Collect vendor details, product category and booking status easily.',
  'Promote your society event, carnival or exhibition professionally.',
];

const VENDOR_POINTS = [
  'Find upcoming events, carnivals and stall opportunities near you.',
  'Create your stall profile with products, photos and business details.',
  'Apply for stalls without searching in multiple WhatsApp groups.',
  'Get updates and alerts for new events and booking openings.',
  'Build trust with past event history and organizer reviews.',
  'Grow your customer reach through society and community events.',
];

function BenefitCard({ id, title, points }: { id: string; title: string; points: string[] }) {
  return (
    <article
      id={id}
      className="rounded-[28px] border border-black/5 bg-white p-6 shadow-soft sm:p-[34px]"
    >
      <h3 className="mb-[18px] text-[22px] font-bold text-ink-700 sm:text-[26px]">{title}</h3>
      <ul className="grid gap-[13px]">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 leading-[1.6] text-ink-400">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[13px] font-extrabold text-white"
            >
              ✓
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Benefits() {
  return (
    <section id="benefits" className="px-[5%] py-[88px] sm:px-[7%]">
      <SectionTitle
        eyebrow="Benefits"
        title="Why organizers and stall owners should join"
        description="No more random WhatsApp forwarding, Excel confusion or last-minute vendor searching. JoinEvents makes event stall management easier."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BenefitCard id="organizers" title="For Event Organizers" points={ORGANIZER_POINTS} />
        <BenefitCard id="vendors" title="For Stall Owners" points={VENDOR_POINTS} />
      </div>
    </section>
  );
}
