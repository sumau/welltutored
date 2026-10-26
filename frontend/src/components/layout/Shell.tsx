import * as React from "react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ShieldCheck, PenTool } from "lucide-react";
import { useState } from "react";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";
import { onOpenPolicy, type Policy } from "@/lib/policy-dialog";

export function Shell({
  children,
  isSignedIn,
}: {
  children: ReactNode;
  isSignedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  React.useEffect(() => onOpenPolicy(setPolicy), []);

  const [location] = useLocation();
  // On a tutor's profile, "Make an enquiry" keeps her chosen.
  const profileSlug = location.match(/^\/tutors\/([^/]+)$/)?.[1];
  const enquireHref = profileSlug ? `/enquire?tutor=${profileSlug}` : "/enquire";

  const closeMenu = () => setMenuOpen(false);

  // An open policy dialog takes focus, closes on Escape, and hands focus back
  // to the button that opened it. Escape also closes the mobile menu.
  const dialogRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!policy && !menuOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    if (policy) dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPolicy(null);
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (policy) opener?.focus();
    };
  }, [policy, menuOpen]);

  // The logo links to Home. Already on Home, the pathname doesn't change, so
  // nothing would happen: go back to the top instead.
  const openHome = (event: React.MouseEvent) => {
    closeMenu();
    if (location !== "/") return;
    event.preventDefault();
    if (window.location.hash) history.replaceState(history.state, "", window.location.pathname + window.location.search);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div className="public-site min-h-[100dvh] flex flex-col font-sans bg-background text-foreground overflow-x-hidden selection:bg-primary/40 selection:text-foreground">
      {/* Navigation */}
      <nav className="h-[82px] w-full max-w-[1210px] mx-auto px-6 md:px-[30px] flex items-center justify-between relative z-40">
        <Link href="/" onClick={openHome} className="group flex items-center gap-2.5 font-bold text-[19px] tracking-tight rounded-full hover:text-primary-border transition-colors" data-testid="nav-home">
          {/* The disc and the wordmark lift to Indigo Lift together, so the logo reads as a link. */}
          <div className="w-[40px] h-[40px] rounded-full bg-foreground group-hover:bg-primary-border transition-colors flex items-center justify-center text-background font-serif text-[24px] pb-0.5">
            w
          </div>
          well tutored
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7 text-[14px] font-semibold">
          {PUBLIC_RESOURCES_ENABLED && (
            <Link href="/resources" className="underline-offset-[6px] decoration-2 decoration-primary hover:underline" data-testid="nav-resources">Insights & resources</Link>
          )}
          <Link href={enquireHref} aria-current={location === "/enquire" ? "page" : undefined} className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary-border transition-colors" data-testid="nav-enquire">
            Make an enquiry
          </Link>
          <Link href={isSignedIn ? "/workspace" : "/sign-in"} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[13px] font-medium" data-testid="nav-workspace">
            <PenTool size={14} /> {isSignedIn ? "Workspace" : "Tutor sign in"}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-3 -mr-3 text-foreground rounded-full"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="nav-mobile-menu"
          data-testid="nav-mobile-toggle"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div id="nav-mobile-menu" className="md:hidden absolute top-[82px] left-4 right-4 rounded-[20px] bg-card z-30 px-6 py-6 border border-border flex flex-col gap-4 text-[16px] font-medium" data-testid="nav-mobile-menu">
          {PUBLIC_RESOURCES_ENABLED && (
            <Link href="/resources" onClick={closeMenu} data-testid="nav-mobile-resources">Insights & resources</Link>
          )}
          <Link href={enquireHref} onClick={closeMenu} aria-current={location === "/enquire" ? "page" : undefined} className="rounded-full bg-primary text-primary-foreground font-semibold px-5 py-3 w-fit" data-testid="nav-mobile-enquire">Make an enquiry</Link>
          <Link href={isSignedIn ? "/workspace" : "/sign-in"} onClick={closeMenu} className="text-muted-foreground hover:text-foreground flex items-center gap-2 pt-4 border-t border-border" data-testid="nav-mobile-workspace">
            <PenTool size={14} /> {isSignedIn ? "Workspace" : "Tutor sign in"}
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* Footer */}
      <footer className="bg-foreground text-background px-6 md:px-[30px] py-[45px] md:py-[60px]" data-testid="footer">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-[40px] md:gap-[30px] text-[14px]">
          
          <div className="md:col-span-5">
            <Link href="/" onClick={openHome} className="group flex items-center gap-2.5 font-bold text-[19px] tracking-tight mb-4 w-fit hover:text-background/80 transition-colors" data-testid="footer-home">
              {/* The white disc and the wordmark fade a little towards the footer on hover. */}
              <div className="w-[40px] h-[40px] rounded-full bg-background group-hover:bg-background/80 transition-colors flex items-center justify-center text-foreground font-serif text-[24px] pb-0.5">
                w
              </div>
              well tutored
            </Link>
            <p className="text-background/80 leading-[1.65] max-w-[300px]">
              Women tutors helping young women grow.
            </p>
          </div>
          
          <div className="md:col-span-3 flex flex-col gap-3 items-start text-background/90">
            {PUBLIC_RESOURCES_ENABLED && (
              <Link href="/resources" className="underline-offset-4 hover:underline" data-testid="footer-resources">Insights & resources</Link>
            )}
            <Link href={enquireHref} className="underline-offset-4 hover:underline" data-testid="footer-enquire">Make an enquiry</Link>
          </div>

          <div className="md:col-span-4 flex flex-col gap-3 items-start text-background/90">
            <button onClick={() => setPolicy("safeguarding")} className="underline-offset-4 hover:underline flex items-center gap-2" data-testid="footer-safeguarding">
               Safeguarding
            </button>
            <button onClick={() => setPolicy("privacy")} className="underline-offset-4 hover:underline flex items-center gap-2" data-testid="footer-privacy">
               Privacy & cookies
            </button>
            {isSignedIn && (
              <Link href="/workspace" className="underline-offset-4 hover:underline mt-2 text-background/70">
                Workspace
              </Link>
            )}
          </div>

          <div className="col-span-1 md:col-span-12 mt-4 md:mt-8 pt-5 border-t border-background/20 text-[12px] text-background/70 flex flex-col sm:flex-row justify-between gap-4">
            <span>© {new Date().getFullYear()} Well Tutored</span>
          </div>

        </div>
      </footer>

      {/* Policies Modals */}
      {policy && (
        <div 
          className="fixed inset-0 bg-foreground/60 z-50 flex justify-center items-center p-4 md:p-6 overflow-y-auto"
          onClick={() => setPolicy(null)}
          data-testid={`modal-${policy}`}
        >
          <div 
            className="bg-card w-full max-w-[530px] rounded-[20px] p-8 md:p-[45px] relative"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-title"
            tabIndex={-1}
            ref={dialogRef}
          >
            <button 
              className="absolute right-4 top-4 p-2 rounded-full text-muted-foreground hover:text-primary-border transition-colors"
              onClick={() => setPolicy(null)}
              aria-label="Close"
              data-testid="modal-close"
            >
              <X size={18} />
            </button>
            
            <ShieldCheck size={26} className="text-foreground mb-5" aria-hidden="true" />
            
            <h2 id="policy-title" className="text-[34px] md:text-[40px] leading-[1.05] mb-5">
              {policy === "safeguarding" ? "Safeguarding comes first" : "Privacy and cookies"}
            </h2>
            
            <div className="text-muted-foreground text-[15px] leading-[1.65] space-y-4">
              {policy === "safeguarding" ? (
                <>
                  <p>Well Tutored is designed for female secondary and A-level students. Enquiries involving under-18s should include a parent or guardian's contact details.</p>
                  <div className="mt-6 pt-5 border-t border-border text-[14px]">
                    <strong className="text-foreground block mb-1">Professional boundaries</strong>
                    For now, tutors contact families through their own channels, such as email or phone, agreed with the parent or guardian first. Tutors' email addresses are never published, student information is not displayed publicly, and the agency keeps oversight of tutor enquiries and introductions.
                  </div>
                </>
              ) : (
                <>
                  <p>We only ask for the information needed to respond to an enquiry. Your details are not published on tutor profiles or shared for marketing.</p>
                  <div className="mt-6 pt-5 border-t border-border text-[14px]">
                    <strong className="text-foreground block mb-1">Cookies and analytics</strong>
                    The site uses no analytics, and no cookies for tracking or advertising. If that changes, it will be explained here first.
                  </div>
                </>
              )}
            </div>

            <button 
              className="mt-8 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold px-6 py-3 hover:bg-primary-border transition-colors flex items-center gap-2"
              onClick={() => setPolicy(null)}
            >
              Close <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
