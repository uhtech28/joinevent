// Reusable section-title block — the small orange eyebrow, big headline, short subtitle.

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-14 max-w-[760px] text-center">
      <div className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.9px] text-brand-orange">
        {eyebrow}
      </div>
      <h2 className="mb-3.5 text-[31px] font-extrabold leading-[1.2] tracking-[-1.2px] text-ink-700 sm:text-[42px]">
        {title}
      </h2>
      {description && (
        <p className="text-base leading-[1.8] text-ink-300">{description}</p>
      )}
    </div>
  );
}
