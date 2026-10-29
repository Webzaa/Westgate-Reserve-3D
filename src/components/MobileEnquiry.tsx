import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { enquiry, useEnquiry } from "@/lib/enquiry";
import { sendLead, validateLeadFields } from "@/lib/lead";
import type { LeadFieldErrors } from "@/lib/lead";
import { track } from "@/lib/analytics";

// Phones: sticky bottom "Enquire Now" bar + bottom-sheet popup.
// Desktop (768px and up): the same popup as a centred card, opened once
// automatically after DESKTOP_AUTO_OPEN_MS (no bar, no button).
// Keep PHONE_QUERY in sync with the `@media (max-width: 767px)` /
// `@media (min-width: 768px)` blocks for `.wg-mbar` / `.wgp` in westgate.css.
const PHONE_QUERY = "(max-width: 767px)";

// Desktop auto-open: delay counted from the end of the preloader (`enabled`).
// Shows on every page load/reload, at most once per load.
const DESKTOP_AUTO_OPEN_MS = 15000;
// Master switch for the desktop auto popup. false = it never opens on desktop;
// set to true to turn it back on. Phones are not affected either way.
const DESKTOP_AUTO_POPUP_ENABLED = false;
// Real desktop only: wide viewport + mouse-like primary pointer, so a phone
// held in landscape never gets the auto popup.
const DESKTOP_AUTO_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

const BASE = import.meta.env.BASE_URL;
const LOGO_SRC = `${BASE}images/logo.png`;
const PRIVACY_HREF = `${BASE}privacy-policy.html`;
// TODO: point this at the real Terms & Conditions page once one exists.
const TERMS_HREF = `${BASE}privacy-policy.html`;

type Errors = LeadFieldErrors & Partial<Record<"consent" | "consent2", string>>;

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getPhone = () => window.matchMedia(PHONE_QUERY).matches;

function useIsPhone() {
  return useSyncExternalStore(subscribePhone, getPhone, () => false);
}

// Keeps the sheet sitting on top of the on-screen keyboard. Browsers only
// shrink the *visual* viewport when the keyboard opens, so a plain
// `position: fixed; bottom: 0` sheet would otherwise be hidden behind it.
function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState({ kb: 0, height: 0 });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;

    const update = () => {
      const kb = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      // Ignore sub-keyboard differences (URL-bar collapse, rounding).
      setInset({ kb: kb > 120 ? kb : 0, height: Math.round(vv.height) });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setInset({ kb: 0, height: 0 });
    };
  }, [active]);

  return inset;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileEnquiry({ enabled }: { enabled: boolean }) {
  const isPhone = useIsPhone();
  const { open, inlineFormVisible } = useEnquiry();

  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const autoShownRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // `active`: the popup exists (phone + desktop). `barActive`: sticky bar (phones only).
  const active = enabled;
  const barActive = enabled && isPhone;
  const inset = useKeyboardInset(barActive && open);

  // Slide the bar in shortly after it mounts so the transition actually runs.
  useEffect(() => {
    if (!barActive) {
      setReady(false);
      return;
    }
    const t = window.setTimeout(() => setReady(true), 40);
    return () => window.clearTimeout(t);
  }, [barActive]);

  // Desktop only: open the popup 15s after the preloader finishes, on every
  // page load (nothing is stored, so a reload shows it again).
  useEffect(() => {
    if (!DESKTOP_AUTO_POPUP_ENABLED) return;
    if (!enabled || isPhone || autoShownRef.current) return;

    const t = window.setTimeout(() => {
      if (!window.matchMedia(DESKTOP_AUTO_QUERY).matches) return;
      autoShownRef.current = true; // once per load, even if the window is resized across 768px
      const state = enquiry.getSnapshot();
      // Visitor is already at the in-page form (or popup is open): don't interrupt.
      if (state.open || state.inlineFormVisible) return;
      track("enquire_popup_auto_open");
      enquiry.open();
    }, DESKTOP_AUTO_OPEN_MS);

    return () => window.clearTimeout(t);
  }, [enabled, isPhone]);

  // Desktop: the page uses Lenis smooth scroll (App.tsx), which listens for wheel
  // events on `window` and scrolls the cinematic page itself even when <html> is
  // overflow:hidden. Keep wheel events that start on the popup from reaching it.
  // (`data-lenis-prevent` on the overlay covers touch-screen laptops.) The Lenis
  // setup and the cinematic engine are not touched.
  useEffect(() => {
    const el = overlayRef.current;
    if (!active || !open || isPhone || !el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: true });
    return () => el.removeEventListener("wheel", stop);
  }, [active, open, isPhone]);

  // While open: lock page scroll, move focus into the dialog, handle Escape,
  // and hand focus back to the bar button on close.
  useEffect(() => {
    if (!active || !open) return;

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    const prevGutter = root.style.getPropertyValue("scrollbar-gutter");
    root.style.overflow = "hidden";
    // Keep the scrollbar's space reserved so desktop layout behind the popup
    // doesn't shift sideways when the scrollbar disappears (no-op on phones).
    root.style.setProperty("scrollbar-gutter", "stable");

    track("enquire_popup_open");
    sheetRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") enquiry.close();
    };
    document.addEventListener("keydown", onKey);

    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
      if (prevGutter) root.style.setProperty("scrollbar-gutter", prevGutter);
      else root.style.removeProperty("scrollbar-gutter");
      trigger?.focus({ preventScroll: true });
    };
  }, [active, open]);

  if (!active) return null;

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const nodes = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const clearError = (field: keyof Errors) => {
    setFormError("");
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const mobile = String(data.get("mobile") || "").replace(/\D/g, "");
    const countryCode = String(data.get("country_code") || "+91");

    const nextErrors: Errors = validateLeadFields({ name, email, mobile, countryCode });
    if (!form.querySelector<HTMLInputElement>('input[name="consent"]')?.checked) {
      nextErrors.consent = "Please authorize us to contact you.";
    }
    if (!form.querySelector<HTMLInputElement>('input[name="consent2"]')?.checked) {
      nextErrors.consent2 = "Please consent to the processing of your data.";
    }

    setErrors(nextErrors);
    setFormError("");

    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        form
          .querySelector<HTMLElement>('[aria-invalid="true"], input[type="checkbox"]:not(:checked)')
          ?.focus();
      });
      return;
    }

    setSubmitting(true);
    try {
      await sendLead({ name, email, mobile, countryCode });
    } catch (error) {
      console.error("Lead submission failed:", error);
      setFormError(
        error instanceof Error ? error.message : "Unable to submit your enquiry. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const overlayStyle = {
    "--wgp-kb": `${inset.kb}px`,
    "--wgp-vvh": inset.height ? `${inset.height}px` : undefined,
  } as CSSProperties;

  const barHidden = !ready || open || inlineFormVisible;

  return createPortal(
    <>
      {isPhone && (
        <div className={`wg-mbar ${barHidden ? "is-hidden" : ""}`} data-testid="mobile-enquire-bar">
          <button
            ref={triggerRef}
            type="button"
            className="wg-mbar__btn"
            aria-haspopup="dialog"
            tabIndex={barHidden ? -1 : 0}
            onClick={enquiry.open}
          >
            Enquire Now
          </button>
        </div>
      )}

      <div
        ref={overlayRef}
        className={`wgp ${open ? "is-open" : ""}`}
        style={overlayStyle}
        data-lenis-prevent={isPhone ? undefined : ""}
        aria-hidden={!open}
        data-testid="mobile-enquire-popup"
        onClick={(e) => {
          if (e.target === e.currentTarget) enquiry.close();
        }}
      >
        <div
          ref={sheetRef}
          className="wgp__sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wgp-title"
          tabIndex={-1}
          onKeyDown={trapTab}
        >
          <button type="button" className="wgp__close" aria-label="Close enquiry form" onClick={enquiry.close}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M4 4 20 20M20 4 4 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <span className="wgp__logo" style={{ "--wgp-logo": `url("${LOGO_SRC}")` } as CSSProperties}>
            <img src={LOGO_SRC} alt="Hiranandani Westgate" />
          </span>

          <h2 id="wgp-title" className="wgp__title">Get In Touch</h2>
          <p className="wgp__note"><span aria-hidden="true">*</span> Denotes mandatory fields</p>

          <form onSubmit={handleSubmit} id="MobileEnquiryForm" name="MobileEnquiryForm" noValidate>
            <div className={`wgp-field ${errors.name ? "has-error" : ""}`}>
              <input
                id="wgp-name"
                name="name"
                type="text"
                placeholder=" "
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "wgp-name-err" : undefined}
                onInput={() => clearError("name")}
              />
              <label htmlFor="wgp-name">Name <i aria-hidden="true">*</i></label>
              {errors.name && <p id="wgp-name-err" className="wgp-error" role="alert">{errors.name}</p>}
            </div>

            <div className={`wgp-field ${errors.email ? "has-error" : ""}`}>
              <input
                id="wgp-email"
                name="email"
                type="email"
                placeholder=" "
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "wgp-email-err" : undefined}
                onInput={() => clearError("email")}
              />
              <label htmlFor="wgp-email">Email <i aria-hidden="true">*</i></label>
              {errors.email && <p id="wgp-email-err" className="wgp-error" role="alert">{errors.email}</p>}
            </div>

            <div className="wgp-row">
              <div className="wgp-field wgp-field--country">
                <select name="country_code" defaultValue="+91" aria-label="Country code">
                  <option value="+91">India (+91)</option>
                  <option value="+971">UAE (+971)</option>
                  <option value="+966">Saudi Arabia (+966)</option>
                  <option value="+974">Qatar (+974)</option>
                  <option value="+65">Singapore (+65)</option>
                  <option value="+44">UK (+44)</option>
                  <option value="+1">USA (+1)</option>
                </select>
              </div>

              <div className={`wgp-field ${errors.mobile ? "has-error" : ""}`}>
                <input
                  id="wgp-phone"
                  name="mobile"
                  type="tel"
                  placeholder=" "
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-invalid={Boolean(errors.mobile)}
                  aria-describedby={errors.mobile ? "wgp-phone-err" : undefined}
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
                    clearError("mobile");
                  }}
                />
                <label htmlFor="wgp-phone">Phone <i aria-hidden="true">*</i></label>
              </div>
            </div>
            {errors.mobile && <p id="wgp-phone-err" className="wgp-error wgp-error--row" role="alert">{errors.mobile}</p>}

            <div className="wgp-consents">
              <label className={`wgp-check ${errors.consent ? "has-error" : ""}`}>
                <input type="checkbox" name="consent" defaultChecked onChange={() => clearError("consent")} />
                <span>I agree and authorize team to contact me. This will override the registry with DNC / NDNC</span>
              </label>
              {errors.consent && <p className="wgp-error" role="alert">{errors.consent}</p>}

              <label className={`wgp-check ${errors.consent2 ? "has-error" : ""}`}>
                <input type="checkbox" name="consent2" defaultChecked onChange={() => clearError("consent2")} />
                <span>
                  I consent to the processing of my personal data according to{" "}
                  <a href={PRIVACY_HREF} target="_blank" rel="noreferrer">Privacy Policy</a> &amp;{" "}
                  <a href={TERMS_HREF} target="_blank" rel="noreferrer">T&amp;C</a>
                </span>
              </label>
              {errors.consent2 && <p className="wgp-error" role="alert">{errors.consent2}</p>}
            </div>

            {formError && <p className="wgp-error wgp-error--form" role="alert">{formError}</p>}

            <button type="submit" className="wgp-submit" disabled={submitting}>
              <span>{submitting ? "Submitting…" : "Submit"}</span>
              {!submitting && (
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}