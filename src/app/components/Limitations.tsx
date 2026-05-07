"use client";

export interface LimitationsBoxProps {
  cannotDetermineList: string[];
}

export default function LimitationsBox({
  cannotDetermineList,
}: LimitationsBoxProps) {
  const hasLessThanThree = cannotDetermineList.length < 3;

  return (
    <section className="w-full rounded-xl border border-sky-400/25 bg-[#111827]/70 p-5 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_12px_30px_rgba(2,6,23,0.45)] sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-sky-200 sm:text-lg">
        What this analysis cannot tell you
      </h2>

      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-200">
        {cannotDetermineList.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {hasLessThanThree ? (
        <p className="mt-4 text-sm text-slate-300/90">
          Some details could not be confidently determined from the document.
        </p>
      ) : null}

      <p className="mt-4 text-xs text-sky-100/75">
        This helps prevent overconfidence in AI-generated analysis.
      </p>
    </section>
  );
}
