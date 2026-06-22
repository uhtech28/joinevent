import { WAITLIST_URL } from '@/lib/constants';

export function Cta() {
  return (
    <section
      id="join"
      className="relative mx-[5%] my-[70px] overflow-hidden rounded-[36px] px-6 py-[55px] text-center shadow-glow sm:mx-[7%] sm:px-10 sm:py-[78px]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,107,53,0.88),rgba(247,183,49,0.88)), url('https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <h2 className="mb-4 text-[31px] font-extrabold leading-tight tracking-[-1px] text-white sm:text-[44px]">
        JoinEvents.in is launching soon
      </h2>
      <p className="mx-auto mb-7 max-w-[720px] text-base leading-[1.8] text-white/95 sm:text-[17px]">
        Be part of India&apos;s upcoming event and stall booking network. Join early and get updates
        for upcoming events, vendor opportunities and organizer tools.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href={WAITLIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn rounded-2xl bg-white px-7 py-[15px] text-base font-bold text-brand-orange shadow-soft hover:-translate-y-0.5"
        >
          Register Now
        </a>
      </div>
    </section>
  );
}
