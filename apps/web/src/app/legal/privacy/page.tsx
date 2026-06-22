// /legal/privacy — Privacy Policy.

import Link from 'next/link';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Legal
        </div>
        <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-navy-800 sm:text-[40px]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-400">Last updated: June 2026</p>

        <article className="prose-content mt-8 space-y-5 text-[15px] leading-relaxed text-ink-600">
          <p>
            This policy describes what data JoinEvents collects, how we use it, and the choices you
            have. We&apos;re committed to being a small, careful steward of the information you give
            us.
          </p>

          <Section title="1. Information we collect">
            <p>
              <strong>You give us:</strong> phone number, email, password (hashed), display name, role
              preference, profile photo, cover photo, bio, business name, KYC documents, event
              details, posts, comments, and reviews.
            </p>
            <p>
              <strong>We collect automatically:</strong> IP address, device + browser type, pages
              visited, click events, and approximate location when you grant the geolocation
              permission. We log session activity for security and abuse prevention.
            </p>
          </Section>

          <Section title="2. How we use it">
            <p>
              We use your data to run the service: signing you in, sending OTP codes, processing
              wallet transactions, displaying events and posts, recommending nearby events, sending
              transactional notifications, and detecting fraud or abuse.
            </p>
          </Section>

          <Section title="3. What we don&apos;t do">
            <p>
              We don&apos;t sell your personal data. We don&apos;t display third-party ads. We
              don&apos;t share your KYC documents with anyone outside our verification team.
            </p>
          </Section>

          <Section title="4. Sharing with service providers">
            <p>
              We use trusted third parties to operate the service: PostgreSQL hosting (DigitalOcean),
              SMS delivery (MSG91), email (Postmark), payments (PayU), and object storage
              (Cloudflare R2). Each receives only the data strictly needed to perform its function.
            </p>
          </Section>

          <Section title="5. Security">
            <p>
              Passwords are hashed with bcrypt. Refresh tokens are hashed before storage. All traffic
              is TLS-encrypted in production. KYC documents are stored with restricted access and
              served only over signed URLs.
            </p>
          </Section>

          <Section title="6. Data retention">
            <p>
              We keep your account data while your account is active. If you delete your account,
              your identifiers (email, phone, Google ID) are anonymised and you can no longer sign
              in. Domain rows (events, reviews, bookings, wallet entries) are preserved in
              anonymised form for audit, accounting, and trust reasons.
            </p>
          </Section>

          <Section title="7. Your rights">
            <p>
              You can update your profile and uploaded photos anytime via Settings &rarr; Edit
              Profile. You can request a copy of your data or full deletion by emailing{' '}
              <a href="mailto:privacy@joinevents.in" className="font-semibold text-brand-orange hover:underline">
                privacy@joinevents.in
              </a>
              . Or delete your account directly via Settings &rarr; Danger Zone.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              We use cookies only for sign-in sessions and security. We do not use marketing or
              analytics cookies. You can clear cookies in your browser at any time &mdash; you may
              need to sign in again afterwards.
            </p>
          </Section>

          <Section title="9. Children">
            <p>
              JoinEvents is not intended for users under 18. We do not knowingly collect data from
              children. If you believe a minor has registered, please contact us so we can remove the
              account.
            </p>
          </Section>

          <Section title="10. Changes">
            <p>
              We&apos;ll notify you of material changes via email or in-app banner. The &ldquo;Last
              updated&rdquo; date at the top of this page always reflects the current version.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Email{' '}
              <a href="mailto:privacy@joinevents.in" className="font-semibold text-brand-orange hover:underline">
                privacy@joinevents.in
              </a>{' '}
              for any privacy questions or to exercise your rights.
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
