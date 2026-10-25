import * as React from "react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ShieldCheck, PenTool } from "lucide-react";
import { useState } from "react";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";
import { scrollToTutors } from "@/lib/scroll-to-tutors";

export function Shell({
  children,
  isSignedIn,
}: {
  children: ReactNode;
  isSignedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [policy, setPolicy] = useState<"safeguarding" | "privacy" | null>(null);

  const [location] = useLocation();

  const closeMenu = () => setMenuOpen(false);

  // Links to the tutors open `/#tutors`, which Home scrolls to on arrival.
  // Already on Home, scroll here instead: the pathname doesn't change.
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

  const openTutors = (event: React.MouseEvent) => {
    closeMenu();
    if (location !== "/") return;
    event.preventDefault();
    scrollToTutors();
  };

  return (
    <div className="public-site min-h-[100dvh] flex flex-col font-sans bg-background text-foreground overflow-x-hidden selection:bg-primary/40 selection:text-foreground">
      {/* Navigation */}
      <nav className="h-[82px] w-full max-w-[1210px] mx-auto px-6 md:px-[30px] flex items-center justify-between relative z-40">
        <Link href="/" onClick={openHome} className="flex items-center gap-2.5 font-bold text-[19px] tracking-tight rounded-full" data-testid="nav-home">
          <div className="w-[32px] h-[32px] rounded-full bg-foreground flex items-center justify-center text-background font-serif text-[20px] pb-0.5">
            w
          </div>
          well tutored
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7 text-[14px] font-semibold">
          <Link href="/#tutors" onClick={openTutors} className="underline-offset-[6px] decoration-2 decoration-primary hover:underline" data-testid="nav-tutors">Meet the tutors</Link>
          {PUBLIC_RESOURCES_ENABLED && (
            <Link href="/resources" className="underline-offset-[6px] decoration-2 decoration-primary hover:underline" data-testid="nav-resources">Insights & resources</Link>
          )}
          <Link href="/enquire" className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary-border transition-colors" data-testid="nav-enquire">
            Make an enquiry
          </Link>
          <Link href={isSignedIn ? "/workspace" : "/sign-in"} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[13px] font-medium" data-testid="nav-workspace">
            <PenTool size={14} /> {isSignedIn ? "Workspace" : "Workspace sign in"}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-3 -mr-3 text-foreground rounded-full"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          data-testid="nav-mobile-toggle"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-[82px] left-4 right-4 rounded-[20px] bg-card z-30 px-6 py-6 border border-border flex flex-col gap-4 text-[16px] font-medium" data-testid="nav-mobile-menu">
          <Link href="/#tutors" onClick={openTutors} data-testid="nav-mobile-tutors">Meet the tutors</Link>
          {PUBLIC_RESOURCES_ENABLED && (
            <Link href="/resources" onClick={closeMenu} data-testid="nav-mobile-resources">Insights & resources</Link>
          )}
          <Link href="/enquire" onClick={closeMenu} className="rounded-full bg-primary text-primary-foreground font-semibold px-5 py-3 w-fit" data-testid="nav-mobile-enquire">Make an enquiry</Link>
          <Link href={isSignedIn ? "/workspace" : "/sign-in"} onClick={closeMenu} className="text-muted-foreground hover:text-foreground flex items-center gap-2 pt-4 border-t border-border" data-testid="nav-mobile-workspace">
            <PenTool size={14} /> {isSignedIn ? "Workspace" : "Workspace sign in"}
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
            <Link href="/" onClick={openHome} className="flex items-center gap-2.5 font-bold text-[19px] tracking-tight mb-4" data-testid="footer-home">
              <div className="w-[32px] h-[32px] rounded-full bg-background flex items-center justify-center text-foreground font-serif text-[20px] pb-0.5">
                w
              </div>
              well tutored
            </Link>
            <p className="text-background/80 leading-[1.65] max-w-[300px]">
              Personalised tutoring from women with deep subject expertise.
            </p>
          </div>
          
          <div className="md:col-span-3 flex flex-col gap-3 items-start text-background/90">
            <Link href="/#tutors" onClick={openTutors} className="underline-offset-4 hover:underline" data-testid="footer-tutors">Meet the tutors</Link>
            {PUBLIC_RESOURCES_ENABLED && (
              <Link href="/resources" className="underline-offset-4 hover:underline" data-testid="footer-resources">Insights & resources</Link>
            )}
            <Link href="/enquire" className="underline-offset-4 hover:underline" data-testid="footer-enquire">Make an enquiry</Link>
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
          >
            <button 
              className="absolute right-4 top-4 p-2 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setPolicy(null)}
              data-testid="modal-close"
            >
              <X size={18} />
            </button>
            
            <ShieldCheck size={26} className="text-foreground mb-5" />
            
            <h2 className="text-[34px] md:text-[40px] leading-[1.05] mb-5">
              {policy === "safeguarding" ? "Safeguarding comes first" : "Privacy and cookies"}
            </h2>
            
            <div className="text-muted-foreground text-[15px] leading-[1.65] space-y-4">
              {policy === "safeguarding" ? (
                <>
                  <p>Well Tutored is designed for female secondary and A-level students. Enquiries involving under-18s should include a parent or guardian's contact details.</p>
                  <div className="mt-6 pt-5 border-t border-border text-[14px]">
                    <strong className="text-foreground block mb-1">Professional boundaries</strong>
                    Tutors communicate through agreed professional channels. Student information is not displayed publicly, and the agency keeps oversight of tutor enquiries and introductions.
                  </div>
                </>
              ) : (
                <>
                  <p>We only ask for the information needed to respond to an enquiry. Your details are not published on tutor profiles or shared for marketing.</p>
                  <div className="mt-6 pt-5 border-t border-border text-[14px]">
                    <strong className="text-foreground block mb-1">Your choices</strong>
                    You can unsubscribe from updates at any time. Any future analytics or cookies will be explained clearly before they are used.
                  </div>
                </>
              )}
            </div>

            <button 
              className="mt-8 rounded-full bg-foreground text-background text-[14px] font-semibold px-6 py-3 hover:bg-foreground/90 transition-colors flex items-center gap-2"
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
