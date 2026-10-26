import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { useCreateEnquiry, type EnquiryReceipt } from "@/client";
import { Check, ChevronDown } from "lucide-react";
import type { Tutor } from "@/client";
import { SafeguardingNote } from "@/components/SafeguardingNote";

interface EnquiryFormProps {
  tutors?: Tutor[];
  // The tutor to start with in the list, such as one named in the link.
  initialTutorSlug?: string;
  onTutorChange?: (slug: string) => void;
  // Whether anything has been typed or picked beyond the tutor, so the page
  // can warn before leaving it.
  onDirtyChange?: (dirty: boolean) => void;
}

// The message starts as a short note to the chosen tutor, ready to send or
// to change, and follows the tutor until it is edited.
function startingMessage(tutors: Tutor[], tutorSlug: string) {
  const firstName = tutors.find((tutor) => tutor.slug === tutorSlug)?.firstName;
  return `Hi ${firstName || "there"},\nI'd like to find out more about lessons with you and how you work.`;
}

export function EnquiryForm({ tutors = [], initialTutorSlug = "", onTutorChange, onDirtyChange }: EnquiryFormProps) {
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
    tutorSlug: initialTutorSlug,
    studentName: "",
    studentAge: "",
    subjectLevel: "",
    message: startingMessage(tutors, initialTutorSlug)
  });

  // Tell the page which tutor is chosen, so it can show her card.
  useEffect(() => {
    onTutorChange?.(form.tutorSlug);
  }, [form.tutorSlug, onTutorChange]);

  const messageEdited = form.message.trim() !== "" && form.message !== startingMessage(tutors, form.tutorSlug);
  const isDirty = !receipt && ([form.name, form.email, form.studentName, form.studentAge, form.subjectLevel]
    .some((value) => value.trim() !== "") || messageEdited);
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const update = (key: keyof typeof form, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "tutorSlug" && prev.message === startingMessage(tutors, prev.tutorSlug)) {
        next.message = startingMessage(tutors, value);
      }
      return next;
    });
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
  if (!form.subjectLevel.trim()) errors.subjectLevel = "Enter the subject and level.";
  if (!form.studentName.trim()) errors.studentName = "Enter the student's name.";
  if (!form.studentAge) errors.studentAge = "Choose the student's age.";
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
          tutorSlug: initialTutorSlug,
          studentName: "",
          studentAge: "",
          subjectLevel: "",
          message: startingMessage(tutors, initialTutorSlug)
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
        className="text-center py-10 px-4"
        data-testid="enquiry-success"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <div className={`w-[50px] h-[50px] ${receipt.deliveryStatus === "delivered" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Check size={24} />
        </div>
        <h2 className="font-serif text-[30px] md:text-[36px] leading-[1.15] mb-4">
          {receipt.deliveryStatus === "delivered" ? `Enquiry sent to ${receipt.tutorName}` : receipt.deliveryStatus === "failed" ? `Enquiry recorded for ${receipt.tutorName}, delivery needs attention` : `Enquiry recorded for ${receipt.tutorName}`}
        </h2>
        <p className="text-muted-foreground text-[16px] leading-[1.6] max-w-[360px] mx-auto mb-8">
          {receipt.message}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full bg-primary text-primary-foreground text-[15px] font-semibold px-6 py-3.5 hover:bg-primary-border transition-colors inline-flex items-center justify-center gap-2"
          data-testid="enquiry-reset"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <div id="enquire" data-testid="enquiry-form-container">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        data-testid="enquiry-form"
        noValidate
      >
        {/* Parent Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label htmlFor="enquiry-parent-name" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
            Parent or guardian name *
            <input 
              id="enquiry-parent-name"
              name="name"
              type="text"
              autoComplete="name"
              ref={(element) => { fieldRefs.current.name = element; }}
              className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors"
              placeholder="e.g. Eleanor James"
              value={form.name}
              onChange={e => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name")}
              aria-describedby={showError("name") ? "enquiry-parent-name-error" : undefined}
              data-testid="input-parent-name"
            />
            {showError("name") && <span id="enquiry-parent-name-error" className="font-normal text-destructive" role="alert">{errors.name}</span>}
          </label>
          <label htmlFor="enquiry-parent-email" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
            Email address *
            <input 
              id="enquiry-parent-email"
              name="email"
              type="email"
              autoComplete="email"
              ref={(element) => { fieldRefs.current.email = element; }}
              className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={showError("email")}
              aria-describedby={showError("email") ? "enquiry-parent-email-error" : undefined}
              data-testid="input-parent-email"
            />
            {showError("email") && <span id="enquiry-parent-email-error" className="font-normal text-destructive" role="alert">{errors.email}</span>}
          </label>
        </div>

        {/* Tutor and subject, side by side so the form fits a laptop screen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tutors.length > 0 && (
            <label htmlFor="enquiry-tutor" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
              Tutor you are interested in *
              <span className="relative flex items-center">
                <select
                  id="enquiry-tutor"
                  name="tutorSlug"
                  ref={(element) => { fieldRefs.current.tutorSlug = element; }}
                  className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors appearance-none w-full pr-12"
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
                <ChevronDown size={18} className="pointer-events-none absolute right-4 text-foreground" aria-hidden="true" />
              </span>
              {showError("tutorSlug") && <span id="enquiry-tutor-error" className="font-normal text-destructive" role="alert">{errors.tutorSlug}</span>}
            </label>
          )}
          <label htmlFor="enquiry-subject-level" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
            Subject and level *
            <input 
              id="enquiry-subject-level"
              name="subjectLevel"
              type="text"
              autoComplete="off"
              ref={(element) => { fieldRefs.current.subjectLevel = element; }}
              className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors"
              placeholder="e.g. GCSE English Literature"
              value={form.subjectLevel}
              onChange={e => update("subjectLevel", e.target.value)}
              onBlur={() => markTouched("subjectLevel")}
              aria-invalid={showError("subjectLevel")}
              aria-describedby={showError("subjectLevel") ? "enquiry-subject-level-error" : undefined}
              data-testid="input-subject-level"
            />
            {showError("subjectLevel") && <span id="enquiry-subject-level-error" className="font-normal text-destructive" role="alert">{errors.subjectLevel}</span>}
          </label>
        </div>

        {/* Student Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label htmlFor="enquiry-student-name" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
            Student's name *
            <input 
              id="enquiry-student-name"
              name="studentName"
              type="text"
              autoComplete="section-student name"
              ref={(element) => { fieldRefs.current.studentName = element; }}
              className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors"
              placeholder="First name"
              value={form.studentName}
              onChange={e => update("studentName", e.target.value)}
              onBlur={() => markTouched("studentName")}
              aria-invalid={showError("studentName")}
              aria-describedby={showError("studentName") ? "enquiry-student-name-error" : undefined}
              data-testid="input-student-name"
            />
            {showError("studentName") && <span id="enquiry-student-name-error" className="font-normal text-destructive" role="alert">{errors.studentName}</span>}
          </label>
          <label htmlFor="enquiry-student-age" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
            Student's age *
            <span className="relative flex items-center">
              <select
                id="enquiry-student-age"
                name="studentAge"
                ref={(element) => { fieldRefs.current.studentAge = element; }}
                className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors appearance-none w-full pr-12"
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
              <ChevronDown size={18} className="pointer-events-none absolute right-4 text-foreground" aria-hidden="true" />
            </span>
            {showError("studentAge") && <span id="enquiry-student-age-error" className="font-normal text-destructive" role="alert">{errors.studentAge}</span>}
          </label>
        </div>

        <label htmlFor="enquiry-message" className="flex flex-col gap-1.5 text-[14px] font-semibold text-foreground">
          What would you like the tutor to know? *
          <textarea 
            id="enquiry-message"
            name="message"
            autoComplete="off"
            ref={(element) => { fieldRefs.current.message = element; }}
            rows={3}
            className="rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[16px] font-normal text-foreground placeholder:text-muted-foreground focus:border-foreground outline-none transition-colors resize-none"
            placeholder="A little about what the student is working on, and what support might feel useful..."
            value={form.message}
            onChange={e => update("message", e.target.value)}
            onBlur={() => markTouched("message")}
            aria-invalid={showError("message")}
            aria-describedby={showError("message") ? "enquiry-message-error" : undefined}
            data-testid="input-message"
          />
          {showError("message") && <span id="enquiry-message-error" className="font-normal text-destructive" role="alert">{errors.message}</span>}
        </label>

        {submitError && (
          <p className="rounded-[10px] border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-[14px] text-destructive" role="alert" data-testid="error-enquiry-submit">
            {submitError}
          </p>
        )}

        <p aria-live="polite" role="status" className="sr-only">
          {isSubmitting ? "Submitting your enquiry." : ""}
        </p>

        {/* The note sits beside the button from sm up, to keep the form short. */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-5">
          <button 
            type="submit"
            ref={submitButtonRef}
            disabled={isSubmitting || createEnquiry.isPending}
            className="shrink-0 rounded-full bg-primary text-primary-foreground text-[16px] font-semibold px-7 py-3.5 hover:bg-primary-border transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-submit-enquiry"
          >
            {isSubmitting ? 'Sending...' : 'Send enquiry'}
          </button>
          <SafeguardingNote className="sm:border-t-0 sm:pt-0 sm:border-l sm:pl-5" />
        </div>
      </form>
    </div>
  );
}
