import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { openPolicy } from "@/lib/policy-dialog";

// The one safeguarding note, word for word wherever an enquiry is described
// or sent: Home's enquiry steps and under every enquiry form. `className`
// only places it.
export function SafeguardingNote({ className = "" }: { className?: string }) {
  return (
    <div className={`pt-[20px] border-t border-border flex items-start gap-3 text-[15px] text-muted-foreground leading-[1.55] ${className}`} data-testid="safeguarding-note">
      <ShieldCheck size={18} className="text-foreground shrink-0 mt-[2px]" aria-hidden="true" />
      <p className="m-0 max-w-[46em]">
        Enquiries for under-18s come from a parent or guardian. Tutors' email
        addresses are never published, and your details are shared only to
        make an introduction.{" "}
        <button
          type="button"
          onClick={() => openPolicy("safeguarding")}
          className="font-semibold text-foreground underline underline-offset-4 hover:text-primary-border transition-colors"
          data-testid="safeguarding-link"
        >
          Read how we keep students safe
        </button>
      </p>
    </div>
  );
}
