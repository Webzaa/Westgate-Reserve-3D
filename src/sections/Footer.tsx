import { useState } from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  return (
    <section id="footer" data-testid="site-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand-rera">
            <div className="houseofhiranandani-logo">
              <a href="https://www.houseofhiranandani.com/" target="_blank" rel="noreferrer">
                <img loading="lazy" src={`${import.meta.env.BASE_URL}images/house-of-hiranandani-logo.svg`} alt="House of Hiranandani" />
              </a>
            </div>
            <div className="HeadOffice">
            <p>Hiranandani Westgate, Hiranandani Estate, Off. Ghodbunder Road, Waghbil, Thane - 400615</p>
          </div>
          </div>

            <div className="maharera">
              <div className="qr">
                <img loading="lazy" src={`${import.meta.env.BASE_URL}images/qr-code.webp`} alt="MahaRERA QR code" />
                <span className="qr-no">PR1331012503026</span>
                <p className="qr-bottom">
                  Hiranandani Westgate - Hampstead
                </p>
              </div>
              <div className="qr">
                <img loading="lazy" src={`${import.meta.env.BASE_URL}images/qr-code_02.jpg`} alt="MahaRERA QR code" />
                <span className="qr-no">P51700077268</span>
                <p className="qr-bottom">
                  Hiranandani Westgate Phase 1
                </p>
              </div>
              <div className="HiranandaniMahaRERA">
                <p>
                  Hiranandani has been registered via MahaRERA registration number and is available on the website{" "}
                  <a href="https://maharera.maharashtra.gov.in" target="_blank" rel="noreferrer">https://maharera.maharashtra.gov.in</a>{" "}
                  under registered projects.
                </p>
              </div>
            </div>

          
        </div>

        <div className="copyright">
          Copyright © {currentYear} All rights reserved
          <span className="copyright-separator">|</span>
          <a href={`${import.meta.env.BASE_URL}privacy-policy.html`} className="copyright-anchor">Privacy Policy</a>
        </div>

        <p id="footer-disclosure-text" className="disclosure-text">
          {disclosureOpen ? (
            <>
              Disclosure: This brochure, including all text, actual photographs, computer-generated imagery, artists' impressions, illustrations, maps, plans, and quotations contained in it, is issued by House of Hiranandani and/or its associated group entity ("HOH") developing the Project and are not to scale, and may differ from the actual size, colour, material, finish, or landscaping maturity of the completed project, intended purely and solely for informational and representational purposes and does not constitute an offer, solicitation, invitation, or commitment of any kind. All information, illustrations, imagery, dimensions, layouts, floor plans, master layout plans, specifications, amenities and facilities, infrastructure references, and Project timelines (if any) are indicative and conceptual, and subject to change without prior notice at the sole discretion of the Promoter. Unless specifically identified as an "Actual Photograph," all visuals—including elevations, aerial views, interiors, landscapes, and views of three zones; leisure, wellness and exploration—are artistic impressions or computer-generated images for representation purposes only. They are not to scale and may differ from the final project in terms of size, colour, materials, finishes, landscaping, and other details. People shown in the visuals are professional models and are not residents, owners, or endorsers of the project unless expressly stated. Furniture, décor, accessories, clothing, pets, vehicles, and other styling elements shown are for illustrative purposes only and are not included with the purchase of any unit or amenity. Locations, landscaping, lighting, foliage, and other features shown are subject to natural growth, weather conditions, seasonal changes, and ongoing development and may not represent the final appearance of every tower, floor, or unit. All prospective purchasers are legally required to review, inspect, and verify all plans, approvals, and all relevant documents, as well as stay informed about any pertinent information and notices included in this Brochure as it is updated. The content, visuals, landscaping, details, specifications, and all other information provided herein are intended solely for illustrative, promotional, advertising, and representational purposes. These materials are artistic impressions and creative depictions only, and do not depict actual scenes. Furniture, furnishings, décor, styling props, apparel, accessories and vehicles (including any shown for photographic styling) do not form part of the actual unit, amenity, or offering and are not included with the purchase of any unit. Nothing contained herein shall constitute a legal offering, commitment, or create any liability on the part of the Developer/Promoter. All transactions shall be governed strictly by the terms and conditions of the registered agreement for sale and/or any other definitive contractual documents, which shall supersede any prior representations made in this Brochure or any other representations, whether written or oral. The trademark, logo, and brand name are the property of the House of Hiranandani Group (HOH). Any other intellectual property referenced herein remains the sole property of their respective owners. HOH reserves all rights in relation to the text, images, designs, and other materials in all of its published digital and printed media. All such details are subject to modifications, amendments, alterations, and revisions at the sole discretion of the Developer/Promoter without any prior notice. No part of this Brochure may be copied, reproduced, or used in any form by any third party without prior written consent from HOH. Nothing in this Brochure or its contents shall create any legal obligation or liability on the Promoter. The Project is registered as “Hiranandani Westgate Phase 1” under MahaRERA Registration No. P51700077268 and Hiranandani Westgate — Hampstead under MahaRERA bearing MahaRERA Registration No. PR1331012503026 and is being developed by Shoden Developers Private Limited of House of Hiranandani. Project details are available at{" "}
              <a href="http://maharera.maharashtra.gov.in" target="_blank" rel="noreferrer" className="copyright-anchor">www.maharera.maharashtra.gov.in</a>. Errors and Omissions Expected.{" "}
              <button type="button" className="disclosure-toggle" aria-expanded="true" aria-controls="footer-disclosure-text" onClick={() => setDisclosureOpen(false)}>Read less</button>
            </>
          ) : (
            <>
              Disclosure: This brochure, including all text, actual photographs, computer-generated imagery, artists' impressions, illustrations, maps, plans, and quotations contained in it, is issued by House of Hiranandani and/or its associated group entity ("HOH") developing the Project and are not to scale, and may differ from the actual size, colour, material, finish, or landscaping maturity of the completed project, intended purely and solely for{" "}
              <button type="button" className="disclosure-toggle" aria-expanded="false" aria-controls="footer-disclosure-text" onClick={() => setDisclosureOpen(true)}>...Read more</button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
