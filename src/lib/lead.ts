// Shared lead validation + submission, used by the in-journey form (LeadForm)
// and the mobile popup (MobileEnquiry) so both send exactly the same payload
// to the same PHP endpoint.
import { getMarketingData, submitLead } from "@/lib/marketing";

export interface LeadFields {
  name: string;
  email: string;
  /** Digits only. */
  mobile: string;
  countryCode: string;
}

export type LeadFieldErrors = Partial<Record<"name" | "email" | "mobile", string>>;

export function validateLeadFields({ name, email, mobile }: LeadFields): LeadFieldErrors {
  const errors: LeadFieldErrors = {};

  if (!name) errors.name = "Full name is required.";
  else if (name.length < 2) errors.name = "Please enter your full name.";

  if (!email) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!mobile) errors.mobile = "Phone number is required.";
  else if (mobile.length !== 10) errors.mobile = "Please enter a valid phone number.";

  return errors;
}

/** Saves the lead and redirects to the thank-you page. Throws on failure. */
export async function sendLead(fields: LeadFields): Promise<void> {
  const marketing = getMarketingData() || {};

  const payload = {
    name: fields.name,
    email: fields.email,
    mobile: fields.mobile,
    countrycode: fields.countryCode || "+91",
    countryname: "India",
    projectSelectValues: "Hiranandani Westgate",
    configuration: "",
    configInterestValues: [""],
    configTypeValues: [""],
    purposeValues: [""],
    visitdayValues: [""],
    favdestinationValues: [""],
    formname: "Hiranandani Westgate Enquiry",
    form_id: "",
    leadgen_id: "",
    page_id: "",
    ad_id: "",
    utm_source: marketing.utm_source || "",
    utm_sub_source: marketing.utm_sub_source || "",
    utm_medium: marketing.utm_medium || "",
    campaigncode: marketing.campaigncode || "",
    campaignname: marketing.campaignname || "",
    Lead_Keyword: marketing.Lead_Keyword || "",
    utm_adset: marketing.utm_adset || "",
    utm_adgroupid: marketing.utm_adgroupid || "", 
    utm_adname: marketing.utm_adname || "",
    cid: marketing.cid || "",
    Lead_Placement: marketing.Lead_Placement || "",
    Lead_Device: marketing.Lead_Device || "",
    gad_source: marketing.gad_source || "",
    gad_campaignid: marketing.gad_campaignid || "",
    gbraid: marketing.gbraid || "",
    gclid: marketing.gclid || "",
    websitename: window.location.hostname,
  };

  const result = await submitLead(payload);
  if (Number(result?.status) !== 1) {
    throw new Error(result?.msg || "Lead submission failed.");
  }

  window.location.assign(`${import.meta.env.BASE_URL}thank-you.html`);
}
