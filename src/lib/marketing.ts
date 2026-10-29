// Marketing/UTM data helper used by the Westgate enquiry form.

export interface MarketingData {
  cid: string;
  utm_source: string;
  utm_sub_source: string;
  utm_medium: string;
  campaigncode: string;
  campaignname: string;
  Lead_Keyword: string;
  utm_adset: string;
  utm_adgroupid: string;
  utm_adname: string;
  Lead_Placement: string;
  Lead_Device: string;
  gad_source: string;
  gad_campaignid: string;
  gbraid: string;
  gclid: string;
}

const MARKETING_KEYS: (keyof MarketingData)[] = [
  "cid",
  "utm_source",
  "utm_sub_source",
  "utm_medium",
  "campaigncode",
  "campaignname",
  "Lead_Keyword",
  "utm_adset",
  "utm_adgroupid",
  "utm_adname",
  "Lead_Placement",
  "Lead_Device",
  "gad_source",
  "gad_campaignid",
  "gbraid",
  "gclid",
];

const STORE_KEY = "marketing_data";

/**
 * Example marketing URL.
 */
// export const EXAMPLE_MARKETING_URL =
//   "https://Westagate3Dv31.com/?cid=2026091111582211414312223814059751526aa39f86aca9f180268567&utm_source=Google&utm_sub_source=Search&utm_medium=cpc&utm_campaignname=Brand&utm_campaignid=123456&utm_adgroupname=Brand&utm_adgroupid=987654&utm_adname=A1&gclid=TEST_GCLID_123&Lead_Keyword=hiranandani%20westgate&Lead_Placement=google.com&Lead_Device=m";

/**
 * Empty marketing object.
 */
const emptyMarketing = (): MarketingData => ({
  cid: "",
  utm_source: "",
  utm_sub_source: "",
  utm_medium: "",
  campaigncode: "",
  campaignname: "",
  Lead_Keyword: "",
  utm_adset: "",
  utm_adgroupid: "",
  utm_adname: "",
  Lead_Placement: "",
  Lead_Device: "",
  gad_source: "",
  gad_campaignid: "",
  gbraid: "",
  gclid: "",
});

/**
 * Safely get the first available parameter.
 *
 * Example:
 * getParam(params, ["gad_campaignid", "utm_campaignid"])
 *
 * It will first check gad_campaignid and then utm_campaignid.
 */
function getParam(
  params: URLSearchParams,
  keys: string[],
): string {
  for (const key of keys) {
    const value = params.get(key);

    if (value !== null && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
}

/**
 * Convert URL parameters into our standard MarketingData format.
 *
 * Supports both:
 *
 * gad_campaignid
 * and
 * utm_campaignid
 *
 * Supports both:
 *
 * utm_adset
 * and
 * utm_adgroupname
 */
function marketingFromParams(params: URLSearchParams): MarketingData {
  const result = emptyMarketing();

  // Campaign key used by the Sperto / HOH CRM.
  result.cid = getParam(params, [
    "cid",
  ]);

  result.utm_source = getParam(params, [
    "utm_source",
  ]);

  result.utm_sub_source = getParam(params, [
    "utm_sub_source",
  ]);

  result.utm_medium = getParam(params, [
    "utm_medium",
  ]);

  result.campaigncode = getParam(params, [
    "campaigncode",
    "utm_campaigncode",
  ]);

  result.campaignname = getParam(params, [
    "campaignname",
    "utm_campaignname",
  ]);

  result.Lead_Keyword = getParam(params, [
    "Lead_Keyword",
    "utm_term",
  ]);

  // Support both parameter names.
  result.utm_adset = getParam(params, [
    "utm_adset",
    "utm_adgroupname",
  ]);

  result.utm_adgroupid = getParam(params, [
    "utm_adgroupid",
    "adgroupid",
  ]);

  result.utm_adname = getParam(params, [
    "utm_adname",
  ]);

  result.Lead_Placement = getParam(params, [
    "Lead_Placement",
  ]);

  result.Lead_Device = getParam(params, [
    "Lead_Device",
  ]);

  result.gad_source = getParam(params, [
    "gad_source",
  ]);

  // Support both Google campaign ID parameter names.
  result.gad_campaignid = getParam(params, [
    "gad_campaignid",
    "utm_campaignid",
  ]);

  result.gbraid = getParam(params, [
    "gbraid",
  ]);

  result.gclid = getParam(params, [
    "gclid",
  ]);

  return result;
}

/**
 * Parse a marketing-tracking URL.
 */
export function parseMarketingUrl(url: string): MarketingData {
  const parsedUrl = new URL(url);

  return marketingFromParams(parsedUrl.searchParams);
}

/**
 * Get stored marketing data from sessionStorage.
 */
function getStoredMarketingData(): MarketingData {
  const empty = emptyMarketing();

  if (typeof window === "undefined") {
    return empty;
  }

  try {
    const storedValue = sessionStorage.getItem(STORE_KEY);

    if (!storedValue) {
      return empty;
    }

    const parsed = JSON.parse(storedValue);

    if (!parsed || typeof parsed !== "object") {
      return empty;
    }

    for (const key of MARKETING_KEYS) {
      if (
        typeof parsed[key] === "string" &&
        parsed[key].trim() !== ""
      ) {
        empty[key] = parsed[key].trim();
      }
    }
  } catch (error) {
    console.warn(
      "Unable to read marketing data from sessionStorage:",
      error,
    );
  }

  return empty;
}

/**
 * Save marketing data to sessionStorage.
 */
function saveMarketingData(data: MarketingData): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.warn(
      "Unable to save marketing data to sessionStorage:",
      error,
    );
  }
}

/**
 * Capture marketing data from the current URL.
 *
 * Priority:
 *
 * 1. Current URL parameter
 * 2. Previously stored sessionStorage value
 * 3. Empty string
 *
 * This means if a user lands on:
 *
 * ?utm_source=Google
 *
 * and then navigates to another page, the Google source
 * will remain available.
 */
export function captureMarketingData(): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(
    window.location.search,
  );

  const urlData = marketingFromParams(params);
  const storedData = getStoredMarketingData();

  const result = emptyMarketing();

  for (const key of MARKETING_KEYS) {
    result[key] =
      urlData[key] ||
      storedData[key] ||
      "";
  }

  saveMarketingData(result);
}

/**
 * Get marketing data.
 *
 * Current URL values always have priority over
 * sessionStorage values.
 */
export function getMarketingData(): MarketingData {
  if (typeof window === "undefined") {
    return emptyMarketing();
  }

  const params = new URLSearchParams(
    window.location.search,
  );

  const urlData = marketingFromParams(params);
  const storedData = getStoredMarketingData();

  const result = emptyMarketing();

  for (const key of MARKETING_KEYS) {
    result[key] =
      urlData[key] ||
      storedData[key] ||
      "";
  }

  saveMarketingData(result);

  return result;
}

/**
 * Return the marketing parameters that are missing.
 *
 * This checks the supported parameter names rather than
 * incorrectly marking utm_campaignid / utm_adgroupname
 * as missing when their equivalent values exist.
 */
export function getMissingMarketingParams(
  url: string,
): string[] {
  const params = new URLSearchParams(
    new URL(url).search,
  );

  const missing: string[] = [];

  if (!getParam(params, ["cid"])) {
    missing.push("cid");
  }

  if (!getParam(params, ["utm_source"])) {
    missing.push("utm_source");
  }

  if (!getParam(params, ["utm_sub_source"])) {
    missing.push("utm_sub_source");
  }

  if (!getParam(params, ["utm_medium"])) {
    missing.push("utm_medium");
  }

  if (
    !getParam(params, [
      "campaigncode",
      "utm_campaigncode",
    ])
  ) {
    missing.push("campaigncode");
  }

  if (
    !getParam(params, [
      "campaignname",
      "utm_campaignname",
    ])
  ) {
    missing.push("campaignname");
  }

  if (
    !getParam(params, [
      "Lead_Keyword",
      "utm_term",
    ])
  ) {
    missing.push("Lead_Keyword");
  }

  if (
    !getParam(params, [
      "utm_adset",
      "utm_adgroupname",
    ])
  ) {
    missing.push("utm_adset");
  }

  if (!getParam(params, ["utm_adgroupid", "adgroupid"])) {
    missing.push("utm_adgroupid");
  }

  if (!getParam(params, ["utm_adname"])) {
    missing.push("utm_adname");
  }

  if (!getParam(params, ["Lead_Placement"])) {
    missing.push("Lead_Placement");
  }

  if (!getParam(params, ["Lead_Device"])) {
    missing.push("Lead_Device");
  }

  if (!getParam(params, ["gad_source"])) {
    missing.push("gad_source");
  }

  if (
    !getParam(params, [
      "gad_campaignid",
      "utm_campaignid",
    ])
  ) {
    missing.push("gad_campaignid");
  }

  if (!getParam(params, ["gbraid"])) {
    missing.push("gbraid");
  }

  if (!getParam(params, ["gclid"])) {
    missing.push("gclid");
  }

  return missing;
}

/**
 * Add missing parameters to a URL.
 *
 * Only adds parameters that are genuinely missing.
 */
export function augmentUrlWithMissingParams(
  url: string,
): string {
  const missing = getMissingMarketingParams(url);

  if (missing.length === 0) {
    return url;
  }

  const parsedUrl = new URL(url);

  for (const key of missing) {
    parsedUrl.searchParams.set(key, "");
  }

  return parsedUrl.toString();
}

/**
 * Lead payload.
 */
export interface LeadPayload {
  [key: string]: unknown;
}

/**
 * Lead API response.
 */
export interface LeadResponse {
  status?: number | string;
  msg?: string;
  [key: string]: unknown;
}

/**
 * Submit lead to Westgate PHP API.
 */
export async function submitLead(
  payload: LeadPayload,
): Promise<LeadResponse> {
  const url =
    `${import.meta.env.BASE_URL}api/api.php`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    console.error(
      "Lead API unreachable:",
      url,
      networkError,
    );

    throw new Error(
      "Could not reach the server. Please check your connection and try again.",
    );
  }

  const text = await response.text();

  let result: LeadResponse;

  try {
    result = JSON.parse(text) as LeadResponse;
  } catch {
    console.error(
      `Lead API returned non-JSON (HTTP ${response.status}) from ${url}:`,
      text.slice(0, 500),
    );

    throw new Error(
      "The server returned an invalid response.",
    );
  }

  if (
    !response.ok &&
    result?.status === undefined
  ) {
    throw new Error(
      `API request failed with status ${response.status}`,
    );
  }

  return result;
}