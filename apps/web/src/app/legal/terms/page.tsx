// /legal/terms — Terms of Service. Plain, honest copy for launch.

import Link from 'next/link';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Legal
        </div>
        <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-navy-800 sm:text-[40px]">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-ink-400">Last updated: June 2026</p>

        <article className="prose-content mt-8 space-y-5 text-[15px] leading-relaxed text-ink-600">
          <p>
            Welcome to JoinEvents.in (&ldquo;JoinEvents&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;).
            By creating an account or using our services, you agree to these terms. Please read them.
          </p>

          <Section title="1. Who can use JoinEvents">
            <p>
              You must be at least 18 years old and capable of forming a legally binding contract to
              use JoinEvents. Business profiles must represent a real organisation operating in India.
            </p>
          </Section>

          <Section title="2. Accounts and verification">
            <p>
              You are responsible for keeping your login credentials secure and for all activity on
              your account. Vendor and organiser accounts must complete KYC verification (PAN /
              Aadhaar / GST / society permission) before publishing events or accepting bookings.
              We may suspend accounts that fail verification, post misleading content, or violate
              these terms.
            </p>
          </Section>

          <Section title="3. Bookings and payments">
            <p>
              Stall bookings move money through your in-app JoinEvents wallet. Top-ups, refunds,
              platform fees, and withdrawals are recorded in a double-entry ledger you can audit on
              your wallet page. Funds are held in escrow until the event ends, then released to the
              organiser. Cancellation refunds follow our published policy: full refund 7+ days before
              the event, 50% within 3&ndash;7 days, no refund after that.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>
              Don&apos;t use JoinEvents for fraud, harassment, illegal goods or services, or content
              that infringes others&apos; rights. Don&apos;t scrape, reverse-engineer, or attempt to
              disrupt the service. We may remove content and suspend accounts that violate these
              rules.
            </p>
          </Section>

          <Section title="5. Content you post">
            <p>
              You retain ownership of the photos, descriptions, and posts you upload. By posting,
              you grant JoinEvents a non-exclusive, royalty-free licence to display and promote your
              content on the platform. You&apos;re responsible for ensuring you have the rights to
              everything you upload.
            </p>
          </Section>

          <Section title="6. Reviews">
            <p>
              Reviews must be honest and based on direct experience. We may remove reviews that
              contain personal attacks, off-topic content, or paid manipulation.
            </p>
          </Section>

          <Section title="7. Service availability">
            <p>
              We work hard to keep JoinEvents available, but we don&apos;t guarantee uninterrupted
              service. Scheduled maintenance, outages, and feature changes happen. We&apos;ll
              communicate significant changes in advance when possible.
            </p>
          </Section>

          <Section title="8. Limitation of liability">
            <p>
              To the extent permitted by law, JoinEvents is not liable for indirect, incidental, or
              consequential damages arising from your use of the service. Our total liability for any
              claim is capped at the fees paid by you in the prior 12 months.
            </p>
          </Section>

          <Section title="9. Changes to these terms">
            <p>
              We may update these terms as the service evolves. Significant changes will be notified
              via email or in-app banner. Continued use after changes means you accept the updated
              terms.
            </p>
          </Section>

          <Section title="10. Governing law">
            <p>
              These terms are governed by the laws of India. Any disputes will be resolved in the
              courts of Delhi NCR.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about these terms? Email{' '}
              <a href="mailto:legal@joinevents.in" className="font-semibold text-brand-orange hover:underline">
                legal@joinevents.in
              </a>
              .
            </p>
          </Section>
        </article>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-orange hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-extrabold text-navy-800">{title}</h2>
      {children}
    </section>
  );
}
