import Link from 'next/link';
import { WAITLIST_URL } from '@/lib/constants';

export function Hero() {
  return (
    <section className="grid items-center gap-10 px-[5%] pb-[70px] pt-[50px] sm:px-[7%] sm:pt-[78px] lg:grid-cols-[1.02fr_.98fr] lg:gap-[55px]">
      {/* Left — copy */}
      <div>
        <h1 className="mb-[22px] text-[36px] font-extrabold leading-[1.08] tracking-[-1px] text-ink-800 sm:text-[44px] lg:text-[58px] lg:tracking-[-2px]">
          Find Events. Book Stalls.{' '}
          <span className="bg-brand-gradient-text bg-clip-text text-transparent">
            Grow Your Business.
          </span>
        </h1>

        <p className="mb-8 max-w-[650px] text-base leading-[1.8] text-ink-300 sm:text-lg">
          JoinEvents is an upcoming platform where event organizers and stall owners connect
          easily. Organizers can fill stalls faster, and vendors can discover upcoming society
          events, carnivals, exhibitions, and pop-up markets.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <a
            href={WAITLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Join Early Access
          </a>
          <a href="#benefits" className="btn btn-secondary">
            Explore Benefits
          </a>
          <Link href="/events" className="btn btn-secondary">
            See Demo Events →
          </Link>
        </div>
      </div>

      {/* Right — image + floating card */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1561489396-888724a1543d?auto=format&fit=crop&w=1200&q=80"
          alt="Carnival event with stalls and visitors"
          className="h-[360px] w-full rounded-[26px] border-[5px] border-white object-cover shadow-main-img sm:h-[520px] sm:rounded-[36px] sm:border-8"
        />

      </div>
    </section>
  );
}
