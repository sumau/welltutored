import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col" data-testid="page-not-found">
      <section className="ruled flex-1 px-[var(--gutter)]">
        <div className="max-w-[1150px] mx-auto pt-[108px] pb-[144px]">
          <h1 className="relative top-[12px] md:top-[8px] font-serif font-extrabold [font-stretch:112%] tracking-[-0.03em] text-[40px] md:text-[52px] leading-[72px] m-0">
            Page not found
          </h1>
          <p className="text-[18px] leading-[36px] m-0 mb-[36px] max-w-[30em]">
            This page doesn't exist or has moved. The tutors are all on the home page.
          </p>
          <Link
            href="/"
            className="ink-button h-[48px] text-[17px] px-6"
          >
            See the tutors
          </Link>
        </div>
      </section>
    </main>
  );
}
