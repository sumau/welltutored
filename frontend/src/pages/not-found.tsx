import { Link } from "wouter";

// A page with nothing to show, and the way back to the tutors.
export function EmptyPage({
  title,
  message,
  testId = "page-not-found",
}: {
  title: string;
  message: string;
  testId?: string;
}) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24" data-testid={testId}>
      <div className="max-w-[30em] text-center">
        <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.1] mb-4">
          {title}
        </h1>
        <p className="text-muted-foreground text-[17px] leading-[1.6] mb-8">
          {message}
        </p>
        <Link
          href="/"
          className="inline-flex rounded-full bg-foreground text-background text-[15px] font-semibold px-6 py-3.5 hover:bg-foreground/90 transition-colors"
        >
          See the tutors
        </Link>
      </div>
    </main>
  );
}

export default function NotFound() {
  return (
    <EmptyPage
      title="Page not found"
      message="This page doesn't exist or has moved. The tutors are all on the home page."
    />
  );
}
