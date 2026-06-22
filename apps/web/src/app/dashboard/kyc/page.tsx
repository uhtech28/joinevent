'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type ApiKycRequest, type PublicBusinessProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const DOC_KINDS = [
  { v: 'pan', label: 'PAN card' },
  { v: 'aadhaar', label: 'Aadhaar (mask all but last 4)' },
  { v: 'gst', label: 'GST certificate' },
  { v: 'rwa_permission', label: 'RWA / Society permission letter' },
  { v: 'org_proof', label: 'Organisation registration proof' },
] as const;

export default function KycPage() {
  const auth = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<PublicBusinessProfile[]>([]);
  const [existing, setExisting] = useState<ApiKycRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [profileId, setProfileId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registrationType, setRegistrationType] = useState('proprietorship');
  const [registrationNo, setRegistrationNo] = useState('');
  const [pan, setPan] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [gstin, setGstin] = useState('');
  const [rwaNote, setRwaNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileKinds, setFileKinds] = useState<string[]>([]);

  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    Promise.all([api.profiles.mine(), api.kyc.mine()])
      .then(([ps, kyc]) => {
        setProfiles(ps);
        setExisting(kyc);
        if (ps.length > 0 && !profileId) setProfileId(ps[0].id);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : (err as Error).message),
      );
  }, [auth.status, profileId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setFiles(list);
    setFileKinds(list.map(() => 'other'));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append(
        'json',
        JSON.stringify({
          businessProfileId: profileId,
          companyName: companyName.trim() || undefined,
          registrationType,
          registrationNo: registrationNo.trim() || undefined,
          panNumber: pan.trim().toUpperCase() || undefined,
          aadhaarLast4: aadhaarLast4.trim() || undefined,
          gstin: gstin.trim().toUpperCase() || undefined,
          rwaPermissionNote: rwaNote.trim() || undefined,
        }),
      );
      form.append('kinds', JSON.stringify(fileKinds));
      for (const f of files) form.append('files', f);
      await api.kyc.submit(form);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-2 sm:px-6 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="bg-purple-gradient-text bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          Verify your business
        </h1>
        <p className="mt-2 text-ink-400">
          Upload identity and organisation documents. Admin will review within 24 hours.
        </p>

        {existing && existing.status !== 'rejected' && (
          <div className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-50 p-5 text-sm">
            <strong>Submission status:</strong> {existing.status}.{' '}
            {existing.documents.length} document{existing.documents.length === 1 ? '' : 's'} on
            file. We'll notify you when an admin decides.
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-300/40 bg-emerald-50 p-5 text-sm text-emerald-700">
            ✅ Submitted. Admin will review shortly. Track progress on your dashboard.
          </div>
        )}

        {!success && (
          <form onSubmit={submit} className="mt-8 space-y-5">
            {profiles.length === 0 ? (
              <div className="rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                You need a business profile first.{' '}
                <Link href="/dashboard/profile/new" className="font-bold underline">
                  Create one
                </Link>
                .
              </div>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink-600">Profile</span>
                <select
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-brand-purple"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} (@{p.username})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name">
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input"
                  placeholder="e.g. Green Acres RWA"
                />
              </Field>
              <Field label="Registration type">
                <select
                  value={registrationType}
                  onChange={(e) => setRegistrationType(e.target.value)}
                  className="input"
                >
                  {['proprietorship', 'llp', 'rwa', 'society', 'company'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Registration number">
                <input
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="PAN (e.g. AAAPA1234A)">
                <input
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="input"
                />
              </Field>
              <Field label="Aadhaar last 4 digits">
                <input
                  value={aadhaarLast4}
                  onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  className="input"
                />
              </Field>
              <Field label="GSTIN (optional)">
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                  className="input"
                />
              </Field>
            </div>

            <Field label="RWA / Society permission note">
              <textarea
                value={rwaNote}
                onChange={(e) => setRwaNote(e.target.value)}
                rows={3}
                className="input"
              />
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink-600">
                Upload supporting documents
              </span>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-dashed border-brand-purple/40 bg-cream-200 px-4 py-3 text-sm"
              />
              {files.length > 0 && (
                <ul className="mt-3 grid gap-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex-1 truncate text-sm text-ink-400">{f.name}</span>
                      <select
                        value={fileKinds[i]}
                        onChange={(e) => {
                          const next = [...fileKinds];
                          next[i] = e.target.value;
                          setFileKinds(next);
                        }}
                        className="rounded-xl border border-black/10 px-2 py-1 text-xs"
                      >
                        {DOC_KINDS.map((d) => (
                          <option key={d.v} value={d.v}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || profiles.length === 0}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {busy ? 'Submitting…' : 'Submit for verification'}
            </button>
          </form>
        )}
      <style>{`.input{width:100%;border-radius:1rem;border:1px solid rgba(0,0,0,.1);background:#fff;padding:0.7rem 1rem;font-size:0.95rem;outline:none;}.input:focus{border-color:#ff6b35;box-shadow:0 0 0 3px rgba(255,107,53,.18);}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-600">{label}</span>
      {children}
    </label>
  );
}
