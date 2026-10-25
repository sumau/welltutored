import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { useCreateEnquiry, type EnquiryReceipt } from "@/client";
import { Check, ShieldCheck } from "lucide-react";
import type { Tutor } from "@/client";

interface EnquiryFormProps {
  tutor?: Tutor;
  tutors?: Tutor[];
  compact?: boolean;
}

export function EnquiryForm({ tutor, tutors = [], compact = false }: EnquiryFormProps) {
  const createEnquiry = useCreateEnquiry();
  const [receipt, setReceipt] = useState<EnquiryReceipt | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const receiptRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const submissionInFlight = useRef(false);
  const focusFirstFieldOnReset = useRef(false);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    tutorSlug: tutor?.slug || "",
    studentName: "",
    studentAge: "",
    subjectLevel: "",
    message: ""
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSubmitError("");
  };

  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Enter the parent or guardian's name.";
  if (!form.email.trim()) {
    errors.email = "Enter an email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.tutorSlug) errors.tutorSlug = "Choose a tutor.";
  if (!form.studentName.trim()) errors.studentName = "Enter the student's name.";
  if (!form.studentAge) errors.studentAge = "Choose the student's age.";
  if (!form.subjectLevel.trim()) errors.subjectLevel = "Enter the subject and level.";
  if (!form.message.trim()) {
    errors.message = "Tell us a little about what support would help.";
  } else if (form.message.trim().length < 10) {
    errors.message = "Use at least 10 characters so the tutor has useful context.";
  }

  const isComplete = Object.keys(errors).length === 0;
  const showError = (key: string) => Boolean(errors[key] && (attemptedSubmit || touched[key]));
  const markTouched = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  useEffect(() => {
    if (receipt) {
      receiptRef.current?.focus();
    } else if (focusFirstFieldOnReset.current) {
      focusFirstFieldOnReset.current = false;
      fieldRefs.current.name?.focus();
    }
  }, [receipt]);

  useEffect(() => {
    if (submitError) {
      submitButtonRef.current?.focus();
    }
  }, [submitError]);

  const handleReset = () => {
    focusFirstFieldOnReset.current = true;
    setReceipt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setTouched(Object.keys(form).reduce<Record<string, boolean>>((result, key) => {
      result[key] = true;
      return result;
    }, {}));
    if (!isComplete || submissionInFlight.current || createEnquiry.isPending) {
      const firstInvalid = Object.keys(errors).find((key) => errors[key]);
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    setSubmitError("");
    submissionInFlight.current = true;
    setIsSubmitting(true);

    createEnquiry.mutate({
      data: form
    }, {
      onSuccess: (result) => {
        submissionInFlight.current = false;
        setIsSubmitting(false);
        setReceipt(result);
        setForm({
          name: "",
          email: "",
          tutorSlug: tutor?.slug || "",
          studentName: "",
          studentAge: "",
          subjectLevel: "",
          message: ""
        });
        setAttemptedSubmit(false);
        setTouched({});
      },
      onError: () => {
        submissionInFlight.current = false;
        setIsSubmitting(false);
        setSubmitError("We could not record your enquiry. Please check the details and try again.");
      }
    });
  };

  if (receipt) {
    return (
      <div
        ref={receiptRef}
        className="text-left"
        data-testid="enquiry-success"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <span className={`flex w-[36px] h-[36px] ${receipt.deliveryStatus === "delivered" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"} rounded-full items-center justify-center`}>
          <Check size={20} />
        </span>
        <h2 className="font-serif text-[26px] md:text-[30px] leading-[1.1] m-0 mt-[36px]">
          {receipt.deliveryStatus === "delivered" ? "Enquiry delivered to Well Tutored" : receipt.deliveryStatus === "failed" ? `Enquiry recorded for ${receipt.tutorName}, delivery needs attention` : `Enquiry recorded for ${receipt.tutorName}`}
        </h2>
        <p className="text-[18px] leading-[1.6] max-w-[30em] m-0 mt-[36px] mb-[36px]">
          {receipt.message}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="ink-button h-[48px] text-[16px] px-6"
          data-testid="enquiry-reset"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <div id="enquire" data-testid="enquiry-form-container">
      {tutor?.intake === "full" ? (
        <div className="text-[18px] leading-[1.6]" data-testid="enquiry-unavailable">
          {tutor.name} is not currently accepting enquiries. Please choose another tutor or check back later.
        </div>
      ) : (
      <>
      {compact ? (
        <div className="mb-[8px]">
          <h3 className="font-serif text-[26px] md:text-[30px] leading-[1.1] m-0 text-foreground">Make an enquiry</h3>
          {!tutor && (
            <p className="text-muted-foreground text-[16px] leading-[1.6] m-0">
              Tell us which tutor you are interested in.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-[8px]">
           <h2 id={compact ? undefined : "enquiry-form-title"} className="font-serif text-[32px] md:text-[40px] leading-[1.1] m-0 text-foreground">
            Ask about {tutor ? tutor.name.split(' ')[0] : 'a tutor'}
          </h2>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-[18px]"
        data-testid="enquiry-form"
        noValidate
        aria-describedby="enquiry-form-instructions"
      >
        <p id="enquiry-form-instructions" className="text-[15px] text-muted-foreground leading-[1.6] m-0">
          Fields marked with an asterisk are required.
        </p>
        {/* Parent Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[24px] gap-y-[18px]">
          <label htmlFor="enquiry-parent-name" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
            Parent or guardian name *
            <input 
              id="enquiry-parent-name"
              name="name"
              type="text"
              autoComplete="name"
              ref={(element) => { fieldRefs.current.name = element; }}
              className="field"
              placeholder="e.g. Eleanor James"
              value={form.name}
              onChange={e => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name")}
              aria-describedby={showError("name") ? "enquiry-parent-name-error" : undefined}
              data-testid="input-parent-name"
            />
            {showError("name") && <span id="enquiry-parent-name-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.name}</span>}
          </label>
          <label htmlFor="enquiry-parent-email" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
            Email address *
            <input 
              id="enquiry-parent-email"
              name="email"
              type="email"
              autoComplete="email"
              ref={(element) => { fieldRefs.current.email = element; }}
              className="field"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={showError("email")}
              aria-describedby={showError("email") ? "enquiry-parent-email-error" : undefined}
              data-testid="input-parent-email"
            />
            {showError("email") && <span id="enquiry-parent-email-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.email}</span>}
          </label>
        </div>

        {/* Tutor Selection (if not pre-selected) */}
        {!tutor && tutors.length > 0 && (
          <label htmlFor="enquiry-tutor" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
            Tutor you are interested in *
            <select
              id="enquiry-tutor"
              name="tutorSlug"
              ref={(element) => { fieldRefs.current.tutorSlug = element; }}
              className="field appearance-none"
              value={form.tutorSlug}
              onChange={e => update("tutorSlug", e.target.value)}
              onBlur={() => markTouched("tutorSlug")}
              aria-invalid={showError("tutorSlug")}
              aria-describedby={showError("tutorSlug") ? "enquiry-tutor-error" : undefined}
              data-testid="input-tutor-select"
            >
              <option value="">Select a tutor</option>
              {tutors.map(t => (
                <option key={t.slug} value={t.slug}>{t.name} ({t.subject})</option>
              ))}
            </select>
            {showError("tutorSlug") && <span id="enquiry-tutor-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.tutorSlug}</span>}
          </label>
        )}

        {/* Student Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[24px] gap-y-[18px]">
          <label htmlFor="enquiry-student-name" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
            Student's name *
            <input 
              id="enquiry-student-name"
              name="studentName"
              type="text"
              autoComplete="section-student name"
              ref={(element) => { fieldRefs.current.studentName = element; }}
              className="field"
              placeholder="First name"
              value={form.studentName}
              onChange={e => update("studentName", e.target.value)}
              onBlur={() => markTouched("studentName")}
              aria-invalid={showError("studentName")}
              aria-describedby={showError("studentName") ? "enquiry-student-name-error" : undefined}
              data-testid="input-student-name"
            />
            {showError("studentName") && <span id="enquiry-student-name-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.studentName}</span>}
          </label>
          <label htmlFor="enquiry-student-age" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
            Student's age *
            <select
              id="enquiry-student-age"
              name="studentAge"
              ref={(element) => { fieldRefs.current.studentAge = element; }}
              className="field appearance-none"
              value={form.studentAge}
              onChange={e => update("studentAge", e.target.value)}
              onBlur={() => markTouched("studentAge")}
              aria-invalid={showError("studentAge")}
              aria-describedby={showError("studentAge") ? "enquiry-student-age-error" : undefined}
              data-testid="input-student-age"
            >
              <option value="">Select</option>
              <option value="Under 13">Under 13</option>
              <option value="13-15">13–15</option>
              <option value="16-17">16–17</option>
              <option value="18+">18+</option>
            </select>
            {showError("studentAge") && <span id="enquiry-student-age-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.studentAge}</span>}
          </label>
        </div>

        <label htmlFor="enquiry-subject-level" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
          Subject and level *
          <input 
            id="enquiry-subject-level"
            name="subjectLevel"
            type="text"
            autoComplete="off"
            ref={(element) => { fieldRefs.current.subjectLevel = element; }}
            className="field"
            placeholder="e.g. GCSE English Literature"
            value={form.subjectLevel}
            onChange={e => update("subjectLevel", e.target.value)}
            onBlur={() => markTouched("subjectLevel")}
            aria-invalid={showError("subjectLevel")}
            aria-describedby={showError("subjectLevel") ? "enquiry-subject-level-error" : undefined}
            data-testid="input-subject-level"
          />
          {showError("subjectLevel") && <span id="enquiry-subject-level-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.subjectLevel}</span>}
        </label>

        <label htmlFor="enquiry-message" className="flex flex-col gap-[4px] text-[15px] leading-[1.6] font-bold text-foreground">
          What would you like the tutor to know? *
          <textarea 
            id="enquiry-message"
            name="message"
            autoComplete="off"
            ref={(element) => { fieldRefs.current.message = element; }}
            rows={4}
            className="field resize-none"
            placeholder="A little about what the student is working on, and what support might feel useful... (min 10 characters)"
            value={form.message}
            onChange={e => update("message", e.target.value)}
            onBlur={() => markTouched("message")}
            aria-invalid={showError("message")}
            aria-describedby={showError("message") ? "enquiry-message-error" : undefined}
            data-testid="input-message"
          />
          {showError("message") && <span id="enquiry-message-error" className="font-bold text-destructive leading-[1.6]" role="alert">{errors.message}</span>}
        </label>

        {submitError && (
          <p className="m-0 text-[16px] leading-[1.6] font-bold text-destructive" role="alert" data-testid="error-enquiry-submit">
            {submitError}
          </p>
        )}

        <p aria-live="polite" role="status" className="sr-only">
          {isSubmitting ? "Submitting your enquiry." : ""}
        </p>

        <button 
          type="submit"
          ref={submitButtonRef}
          disabled={!isComplete || isSubmitting || createEnquiry.isPending}
          className="mt-[12px] mb-[12px] h-[48px] self-start ink-button text-[17px] px-7 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-submit-enquiry"
        >
          {isSubmitting ? 'Sending...' : 'Send enquiry'}
        </button>

        <div className="flex items-start gap-3 text-[15px] text-muted-foreground leading-[1.6]">
          <ShieldCheck size={18} className="text-foreground shrink-0 mt-[9px]" />
          <p>
            Safeguarding note: enquiries for under-18s should come from a parent or guardian. No tutor email addresses are published, and your details are shared only to make an introduction.
          </p>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
