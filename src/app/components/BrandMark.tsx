"use client";

import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type BrandMarkProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
};

const sizeClasses = {
  sm: {
    logo: "size-8",
    word: "text-lg tracking-[0.14em] sm:text-xl",
    gap: "gap-2.5",
  },
  md: {
    logo: "size-10",
    word: "text-[1.35rem] tracking-[0.16em]",
    gap: "gap-3",
  },
  lg: {
    logo: "size-16 sm:size-20",
    word: "text-4xl tracking-[0.16em] sm:text-5xl",
    gap: "gap-4",
  },
} as const;

export default function BrandMark({ href, size = "md", subtitle, className = "" }: BrandMarkProps) {
  const sizes = sizeClasses[size];
  const content = (
    <span className={`inline-flex items-center ${sizes.gap} ${className}`}>
      <Image
        src="/lexalyze-mark.svg"
        alt=""
        aria-hidden="true"
        width={80}
        height={80}
        className={`${sizes.logo} shrink-0 rounded-full object-contain shadow-[0_0_18px_rgba(201,168,76,0.18)]`}
      />
      <span className="min-w-0">
        <span className={`${playfair.className} block font-bold leading-none text-[#C9A84C] ${sizes.word}`}>
          LEXALYZE
        </span>
        {subtitle ? (
          <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.26em] text-neutral-500">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex transition-opacity hover:opacity-85">
      {content}
    </Link>
  );
}
