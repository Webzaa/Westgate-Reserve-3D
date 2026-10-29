import { useState } from "react";
import type { FormEvent } from "react";
import { sendLead, validateLeadFields } from "@/lib/lead";

type Errors = Partial<Record<"name" | "email" | "mobile" | "consentbox", string>>;

export function LeadForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const clearError = (field: keyof Errors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const mobile = String(formData.get("mobile") || "").replace(/\D/g, "");
    const consent = Boolean(form.querySelector<HTMLInputElement>('input[name="consentbox"]')?.checked);

    const nextErrors: Errors = validateLeadFields({ name, email, mobile, countryCode: "" });

    if (!consent) nextErrors.consentbox = "Please authorize us to contact you.";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        const firstInvalid = form.querySelector<HTMLElement>(
          '[aria-invalid="true"], input[name="consentbox"]:not(:checked)',
        );
        firstInvalid?.focus();
      });
      return false;
    }
    return true;
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !validateForm(event)) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);

    try {
      const mobileDigits = String(formData.get("mobile") || "").replace(/\D/g, "");

      await sendLead({
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        mobile: mobileDigits,
        countryCode: String(formData.get("country_code") || "+91"),
      });
    } catch (error) {
      console.error("Lead submission failed:", error);
      alert(error instanceof Error ? error.message : "Unable to submit your enquiry. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <section className="moreInfromation-wrp" id="enquire" aria-label="Enquire about Hiranandani Westgate">
      <div className="moreInfromation-grid">
        <div className="moreInfromation-lhs">
          <img
            loading="lazy"
            src={`${import.meta.env.BASE_URL}images/moreinfomation-img.webp`}
            width="100%"
            alt="Artist's impression of Hiranandani Westgate"
          />
          <div className="project-highlights-wrap">
            <div className="project-highlights">
              <div className="project-highlights-item"><strong>25-Acre</strong><span>Development</span></div>
              <div className="project-highlights-item"><strong>60+</strong><span>Amenities</span></div>
              <div className="project-highlights-item"><strong>30,000 Sq. Ft.</strong><span>Clubhouse</span></div>
              <div className="project-highlights-item"><strong>6+ Acres</strong><span>Landscaped Podium</span></div>
              <div className="project-highlights-item"><strong>03</strong><span>Thematic Zones</span></div>
              <div className="project-highlights-item"><strong>65%</strong><span>Open Space<sup>#</sup></span></div>
              <div className="project-highlights-item"><strong>High-Street</strong><span>Retail</span></div>
            </div>
            <p className="project-highlights-note">
              #The development spans 25 acres of land, with approximately 65% dedicated to open space, featuring amenities, a wellness zone, and retail conveniences.
            </p>
          </div>
        </div>

        <div className="moreInfromation-rhs">
          <div className="common-ttle brown">
            <h2>Are you ready to discover Westgate Reserve?</h2>
            <p>Get in touch for more information.</p>
          </div>

          <div className="getintouchRight anim">
            <div className="login-box">
              <form onSubmit={handleLeadSubmit} name="PopupForm" id="PopupForm" noValidate>
                <div className="form-field">
                  <div className={`user-box ${errors.name ? "has-error" : ""}`}>
                    <input type="text" name="name" aria-invalid={Boolean(errors.name)} onInput={() => clearError("name")} autoComplete="name" />
                    <label className="labeltag">Name</label>
                    {errors.name && <div className="field-error">{errors.name}</div>}
                  </div>
                </div>

                <div className="form-field">
                  <div className={`user-box ${errors.email ? "has-error" : ""}`}>
                    <input type="email" name="email" aria-invalid={Boolean(errors.email)} onInput={() => clearError("email")} autoComplete="email" />
                    <label className="labeltag">Email</label>
                    {errors.email && <div className="field-error">{errors.email}</div>}
                  </div>
                </div>

                <div className="form-field">
                  <div className={`user-box ${errors.mobile ? "has-error" : ""}`}>
                    <div className="phone-control">
                      <select name="country_code" defaultValue="+91" aria-label="Country code">
                        <option value="+91">IN +91</option>
                        <option value="+971">AE +971</option>
                        <option value="+966">SA +966</option>
                        <option value="+974">QA +974</option>
                        <option value="+65">SG +65</option>
                        <option value="+44">UK +44</option>
                        <option value="+1">US +1</option>
                      </select>
                      <input
                        type="tel"
                        name="mobile"
                        maxLength={10}
                        inputMode="numeric"
                        aria-invalid={Boolean(errors.mobile)}
                        onInput={(event) => {
                          event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
                          clearError("mobile");
                        }}
                        autoComplete="tel-national"
                      />
                    </div>
                    <label className="labeltag">Phone</label>
                    {errors.mobile && <div className="field-error">{errors.mobile}</div>}
                  </div>
                </div>

                <div className="honeypot" aria-hidden="true">
                  <label htmlFor="honeypot">Leave this field blank:</label>
                  <input type="text" id="honeypot" name="honeypot" tabIndex={-1} autoComplete="off" />
                </div>

                <div className={`consent-field ${errors.consentbox ? "has-error" : ""}`}>
                  <label className="largercheckbox" htmlFor="flexCheckDefault">
                    <input type="checkbox" required name="consentbox" value="" defaultChecked id="flexCheckDefault" />
                    <span>
                      I agree and authorize team to contact me. This will override the registry with DNC / NDNC. I accept the{" "}
                      <a href={`${import.meta.env.BASE_URL}privacy-policy.html`} target="_blank" rel="noreferrer">Privacy Policy</a>
                    </span>
                  </label>
                  {errors.consentbox && <div className="field-error consent-error">{errors.consentbox}</div>}
                </div>

                <button type="submit" className="commonBt" id="FooterEnquire" disabled={submitting}>
                  <span><strong>{submitting ? "Submitting…" : "Enquire Now"}</strong></span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
