import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="flex-1 ruled flex items-center justify-center px-[var(--gutter)] py-[108px]" data-testid="page-not-found">
      <div className="max-w-[30em] text-center">
        <h1 className="font-serif font-extrabold [font-stretch:112%] tracking-[-0.03em] text-[40px] md:text-[52px] leading-[72px] m-0">
          Page not found
        </h1>
        <p className="text-[18px] leading-[36px] m-0 mb-[36px]">
          This page doesn't exist or has moved. The tutors are all on the home page.
        </p>
        <Link
          href="/"
          className="ink-button text-[17px] px-6 py-3"
        >
          See the tutors
        </Link>
      </div>
    </main>
  );
}
