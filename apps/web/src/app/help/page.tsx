// /help — public help centre. Static FAQ + contact for now.

import Link from 'next/link';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export const metadata = { title: 'Help Centre' };

const FAQS = [
  {
    q: 'How do I list my event on JoinEvents?',
    a: 'Sign in as an organiser, head to your dashboard and click "Create Event". Fill in the dates, venue and stall mix — it goes live after KYC approval.',
  },
  {
    q: 'How do payments and refunds work?',
    a: 'All money moves through the JoinEvents wallet. Top up via UPI or card, book stalls instantly, and request a withdrawal once your event ends.',
  },
  {
    q: 'How do I get my profile verified?',
    a: 'Go to Settings → Edit Profile → Submit KYC. Upload PAN/Aadhaar/GST docs and we approve within 24 hours.',
  },
  {
    q: 'A vendor cancelled — what happens to the stall fee?',
    a: 'Cancellation refunds follow our policy: full refund 7+ days before the event, 50% within 3–7 days, no refund after that. The wallet ledger handles it automatically.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'On the login page, click "Forgot password?" — we will email a reset link valid for one hour.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Settings → Danger zone → Delete account. Your events and reviews stay in the system anonymised for audit, but your sign-in is closed permanently.',
  },
];

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <header>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            Help Centre
          </div>
          <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-navy-800 sm:text-[40px]">
            We&apos;re here to help.
          </h1>
          <p className="mt-2 max-w-prose text-sm text-ink-500 sm:text-base">
            Common questions about hosting events, listing stalls, payments and your account.
            Can&apos;t find an answer below? Reach out at the contact card.
          </p>
        </header>

        {/* Contact card */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <ContactCard
            title="Email support"
            value="support@joinevents.in"
            href="mailto:support@joinevents.in"
            icon="📧"
            tint="from-brand-orange/15 to-brand-pink/15"
          />
          <ContactCard
            title="Twitter / X"
            value="@joineventsin"
            href="https://twitter.com/joineventsin"
            icon="🐦"
            tint="from-emerald-100 to-ribbon-blue/15"
          />
        </section>

        {/* FAQs */}
        <section className="mt-10">
          <h2 className="text-lg font-extrabold text-navy-800">Frequently asked</h2>
          <div className="mt-4 space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-black/5 bg-white p-5 shadow-soft transition open:shadow-card"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold text-navy-800">
                  <span>{faq.q}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-100 text-base text-brand-orange transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Back to dashboard */}
        <div className="mt-10 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-orange hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ContactCard({
  title,
  value,
  href,
  icon,
  tint,
}: {
  title: string;
  value: string;
  href: string;
  icon: string;
  tint: string;
}) {
  return (
    <a
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border border-black/5 bg-gradient-to-br ${tint} p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
          {title}
        </span>
        <span className="block truncate text-sm font-extrabold text-navy-800 group-hover:text-brand-orange">
          {value}
        </span>
      </span>
    </a>
  );
}
