import { useEnquiry } from "@/lib/enquiry";

export function Header() {
  const { formReached } = useEnquiry();
  return (
    <header className={`wg-header ${formReached ? "is-solid" : ""}`} data-testid="site-header">
      <a href="#top" aria-label="Hiranandani Westgate — back to top">
        <img
          className="left-logo"
          src={`${import.meta.env.BASE_URL}images/logo.png`}
          alt="Hiranandani Westgate"
          style={{ pointerEvents: "auto" }}
        />
      </a>
      <a className="enquire-link" href="#enquire" data-testid="header-enquire">
        Enquire Now
      </a>
      <img
        className="right-logo"
        src={`${import.meta.env.BASE_URL}images/favicon.png`}
        width={57}
        alt="House of Hiranandani"
      />
    </header>
  );
}
