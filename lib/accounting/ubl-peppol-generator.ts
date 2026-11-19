import { LEGAL_ENTITY, type UnifiedInvoiceRecord } from "@/lib/accounting/belgian-tax-rules"

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function extractBce10Digits(raw?: string | null): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 9) return `0${digits}`
  if (digits.length === 10) return digits
  return ""
}

function formatIsoDate(isoString?: string | null): string {
  if (!isoString) return new Date().toISOString().slice(0, 10)
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function formatEurDisplay(amount: number): string {
  return amount.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getSupplierLegalAddress() {
  const street = (process.env.INIT42_LEGAL_STREET || "").trim() || "Thier Martin 113 boîte C"
  const postalCode = (process.env.INIT42_LEGAL_POSTAL_CODE || "").trim() || "4651"
  const city = (process.env.INIT42_LEGAL_CITY || "").trim() || "Herve"
  return { street, postalCode, city }
}

export function isPeppolLegalAddressConfigured(): boolean {
  const addr = getSupplierLegalAddress()
  return Boolean(addr.street && addr.postalCode && addr.city)
}

/**
 * Génère une facture structurée XML UBL 2.1 / Peppol BIS Billing 3.0 (EN 16931).
 * Compatible avec tous les Points d'Accès Peppol belges (obligatoire B2B depuis 01/01/2026).
 */
export function generatePeppolUblXml(invoice: UnifiedInvoiceRecord): string {
  const supplierAddress = getSupplierLegalAddress()
  const isCreditNote = invoice.invoice_type === "credit_note"
  const rootTag = isCreditNote ? "CreditNote" : "Invoice"
  const rootNs = isCreditNote
    ? "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
    : "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  const typeCodeTag = isCreditNote ? "cbc:CreditNoteTypeCode" : "cbc:InvoiceTypeCode"
  const typeCodeVal = isCreditNote ? "381" : "380"
  const lineTag = isCreditNote ? "cac:CreditNoteLine" : "cac:InvoiceLine"
  const qtyTag = isCreditNote ? "cbc:CreditedQuantity" : "cbc:InvoicedQuantity"

  const issueDate = formatIsoDate(invoice.issued_at)
  const dueDate = formatIsoDate(invoice.paid_at || invoice.issued_at)

  const htva = Math.abs(Number(invoice.amount_htva || 0)).toFixed(2)
  const vat = Math.abs(Number(invoice.amount_vat || 0)).toFixed(2)
  const ttc = Math.abs(Number(invoice.amount_ttc || 0)).toFixed(2)
  const vatRate = Number(invoice.vat_rate || 21).toFixed(2)

  const clientBceDigits =
    extractBce10Digits(invoice.client_bce_number) ||
    extractBce10Digits(invoice.client_vat_number)
  const clientVatClean = clientBceDigits
    ? `BE${clientBceDigits}`
    : (invoice.client_vat_number || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
  const clientPeppolId = clientBceDigits || clientVatClean || "0000000000"
  const clientCountry = (invoice.client_country || "BE").toUpperCase().slice(0, 2)

  const clientStreet = invoice.client_street?.trim() || "Siège social (à compléter)"
  const clientCity = invoice.client_city?.trim() || "Belgique"
  const clientPostal = invoice.client_postal_code?.trim() || "1000"

  const paymentMethodUpper = (invoice.payment_method || "").toLowerCase()
  const isBankTransfer =
    paymentMethodUpper.includes("virement") || paymentMethodUpper.includes("transfer")
  const paymentMeansCode = isBankTransfer ? "30" : "48"
  const paymentId = invoice.payment_reference || invoice.invoice_number

  return `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag}
  xmlns="${rootNs}"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  ${isCreditNote ? "" : `<cbc:DueDate>${dueDate}</cbc:DueDate>`}
  <${typeCodeTag}>${typeCodeVal}</${typeCodeTag}>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${escapeXml(paymentId)}</cbc:BuyerReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0208">${LEGAL_ENTITY.bceDigits}</cbc:EndpointID>
      <cac:PartyIdentification>
        <cbc:ID schemeID="0208">${LEGAL_ENTITY.bceDigits}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(`${LEGAL_ENTITY.legalName} — ${LEGAL_ENTITY.commercialName}`)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(supplierAddress.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(supplierAddress.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(supplierAddress.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${LEGAL_ENTITY.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${LEGAL_ENTITY.vatCompact}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(LEGAL_ENTITY.operatorLegalLine)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0208">${LEGAL_ENTITY.bceDigits}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXml(LEGAL_ENTITY.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0208">${escapeXml(clientPeppolId)}</cbc:EndpointID>
      <cac:PartyName>
        <cbc:Name>${escapeXml(invoice.client_company_name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(clientStreet)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(clientCity)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(clientPostal)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXml(clientCountry)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${
        clientVatClean
          ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(clientVatClean)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ""
      }
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(invoice.client_company_name)}</cbc:RegistrationName>
        ${clientBceDigits ? `<cbc:CompanyID schemeID="0208">${escapeXml(clientBceDigits)}</cbc:CompanyID>` : ""}
      </cac:PartyLegalEntity>
      ${
        invoice.client_email
          ? `<cac:Contact>
        <cbc:ElectronicMail>${escapeXml(invoice.client_email)}</cbc:ElectronicMail>
      </cac:Contact>`
          : ""
      }
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${paymentMeansCode}</cbc:PaymentMeansCode>
    <cbc:PaymentID>${escapeXml(paymentId)}</cbc:PaymentID>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${LEGAL_ENTITY.ibanCompact}</cbc:ID>
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${LEGAL_ENTITY.bic}</cbc:ID>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${vat}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${htva}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${vat}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${htva}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${htva}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${ttc}</cbc:TaxInclusiveAmount>
    <cbc:PrepaidAmount currencyID="EUR">${invoice.status === "paid" ? ttc : "0.00"}</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="EUR">${invoice.status === "paid" ? "0.00" : ttc}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <${lineTag}>
    <cbc:ID>1</cbc:ID>
    <${qtyTag} unitCode="C62">1</${qtyTag}>
    <cbc:LineExtensionAmount currencyID="EUR">${htva}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(invoice.line_description)}</cbc:Description>
      <cbc:Name>${escapeXml(invoice.line_description.slice(0, 120))}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${vatRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${htva}</cbc:PriceAmount>
    </cac:Price>
  </${lineTag}>
</${rootTag}>
`
}

/**
 * Génère une facture HTML B2B prête pour impression / export PDF natif navigateur,
 * suivant strictement les tokens visuels Aegis Solaire (canvas #eef2f4, encre #142d42).
 */
export function renderOfficialInvoiceHtml(invoice: UnifiedInvoiceRecord): string {
  const supplierAddress = getSupplierLegalAddress()
  const isCreditNote = invoice.invoice_type === "credit_note"
  const docTitle = isCreditNote ? "NOTE DE CRÉDIT" : "FACTURE B2B"
  const issuedDisplay = new Date(invoice.issued_at).toLocaleDateString("fr-BE")
  const paidDisplay = invoice.paid_at
    ? new Date(invoice.paid_at).toLocaleDateString("fr-BE")
    : issuedDisplay

  const clientAddressLines = [
    invoice.client_street,
    [invoice.client_postal_code, invoice.client_city].filter(Boolean).join(" "),
    invoice.client_country || "Belgique",
  ].filter(Boolean)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(docTitle)} ${escapeHtml(invoice.invoice_number)} — ${escapeHtml(LEGAL_ENTITY.commercialName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      background: #eef2f4;
      color: #142d42;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .toolbar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #142d42;
      background: #142d42;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-outline {
      background: #ffffff;
      color: #142d42;
      border-color: #dce5eb;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #dce5eb;
      border-radius: 14px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e6edf1;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #142d42;
    }
    .muted { color: #4d6374; font-size: 13px; line-height: 1.5; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      background: #e8f2ed;
      color: #1d5d45;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 28px 0;
    }
    .box {
      background: #f6f8fa;
      border: 1px solid #e2eaf0;
      border-radius: 10px;
      padding: 16px 18px;
    }
    .box-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #4d6374;
      margin-bottom: 6px;
    }
    .meta-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f0f5f8;
      border: 1px solid #dce5eb;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4d6374;
      padding: 10px 8px;
      border-bottom: 2px solid #dce5eb;
    }
    td {
      padding: 14px 8px;
      border-bottom: 1px solid #e6edf1;
      font-size: 14px;
      vertical-align: top;
    }
    .num { text-align: right; white-space: nowrap; }
    .totals {
      margin-left: auto;
      width: 320px;
      border: 1px solid #dce5eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid #e6edf1;
    }
    .totals-row.final {
      background: #142d42;
      color: #ffffff;
      font-size: 16px;
      font-weight: 800;
      border-bottom: 0;
    }
    .legal-footer {
      margin-top: 32px;
      padding-top: 18px;
      border-top: 1px solid #e6edf1;
      font-size: 12px;
      color: #4d6374;
      line-height: 1.6;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { border: 0; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="muted mono">Document comptable conforme · Peppol ID ${LEGAL_ENTITY.peppolId}</span>
    <div style="display:flex; gap:8px;">
      <a class="btn btn-outline" href="?format=ubl" download="${escapeHtml(invoice.invoice_number)}.xml">Télécharger XML Peppol</a>
      <button class="btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    </div>
  </div>

  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">${escapeHtml(LEGAL_ENTITY.commercialName)}</div>
        <div class="muted" style="margin-top: 4px;">
          Exploité par <strong>${escapeHtml(LEGAL_ENTITY.operatorLegalLine)}</strong><br/>
          BCE / TVA : <span class="mono">${escapeHtml(LEGAL_ENTITY.vat)}</span><br/>
          Liège, Belgique · ${escapeHtml(LEGAL_ENTITY.email)}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: 700; color: #305a76; letter-spacing: 0.06em;">${escapeHtml(docTitle)}</div>
        <div class="mono" style="font-size: 24px; font-weight: 800; margin: 4px 0;">${escapeHtml(invoice.invoice_number)}</div>
        <span class="badge">${invoice.status === "paid" ? "ACQUITTÉE" : escapeHtml(invoice.status.toUpperCase())}</span>
      </div>
    </div>

    <div class="parties">
      <div class="box">
        <div class="box-label">Émetteur (Fournisseur)</div>
        <strong style="font-size: 15px;">${escapeHtml(LEGAL_ENTITY.operatorLegalLine)}</strong>
        <div class="muted" style="margin-top: 4px;">
          Enseigne : ${escapeHtml(LEGAL_ENTITY.commercialName)} (UE 2.391.304.376)<br/>
          Siège : ${escapeHtml(supplierAddress.street)}, ${escapeHtml(supplierAddress.postalCode)} ${escapeHtml(supplierAddress.city)}<br/>
          Numéro BCE / TVA : <span class="mono">${escapeHtml(LEGAL_ENTITY.vat)}</span><br/>
          IBAN : <span class="mono">${escapeHtml(LEGAL_ENTITY.iban)}</span> (${escapeHtml(LEGAL_ENTITY.bic)})
        </div>
      </div>

      <div class="box">
        <div class="box-label">Client B2B (Destinataire)</div>
        <strong style="font-size: 15px;">${escapeHtml(invoice.client_company_name)}</strong>
        <div class="muted" style="margin-top: 4px;">
          ${
            invoice.client_vat_number
              ? `TVA / BCE : <span class="mono">${escapeHtml(invoice.client_vat_number)}</span><br/>`
              : `<span style="color:#9a2f2b;">N° TVA client non renseigné (synchroniser via BCE)</span><br/>`
          }
          ${clientAddressLines.map((line) => escapeHtml(line)).join("<br/>")}
          ${invoice.client_email ? `<br/>${escapeHtml(invoice.client_email)}` : ""}
        </div>
      </div>
    </div>

    <div class="meta-strip">
      <div>
        <div class="box-label">Date d'émission</div>
        <div class="mono" style="font-weight:700; font-size:13px;">${escapeHtml(issuedDisplay)}</div>
      </div>
      <div>
        <div class="box-label">Date de règlement</div>
        <div class="mono" style="font-weight:700; font-size:13px;">${escapeHtml(paidDisplay)}</div>
      </div>
      <div>
        <div class="box-label">Mode de paiement</div>
        <div style="font-weight:700; font-size:13px;">${escapeHtml(invoice.payment_method || "Bancontact / Mollie")}</div>
      </div>
      <div>
        <div class="box-label">Référence paiement</div>
        <div class="mono" style="font-weight:700; font-size:12px;">${escapeHtml(invoice.payment_reference || invoice.invoice_number)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description de la prestation B2B</th>
          <th class="num">Qté</th>
          <th class="num">TVA</th>
          <th class="num">Montant HTVA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${escapeHtml(invoice.line_description)}</strong>
            ${
              invoice.credits_amount > 0
                ? `<div class="muted" style="margin-top:3px;">Dotation : <span class="mono">+${invoice.credits_amount}</span> crédits marketplace Aegis Solaire</div>`
                : ""
            }
          </td>
          <td class="num mono">1</td>
          <td class="num mono">${Number(invoice.vat_rate || 21).toFixed(0)} %</td>
          <td class="num mono" style="font-weight:700;">${formatEurDisplay(invoice.amount_htva)} €</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Total HTVA</span>
        <span class="mono" style="font-weight:700;">${formatEurDisplay(invoice.amount_htva)} €</span>
      </div>
      <div class="totals-row">
        <span>TVA belge (${Number(invoice.vat_rate || 21).toFixed(0)} %)</span>
        <span class="mono" style="font-weight:700;">${formatEurDisplay(invoice.amount_vat)} €</span>
      </div>
      <div class="totals-row final">
        <span>Total TTC ${invoice.status === "paid" ? "acquitté" : "à payer"}</span>
        <span class="mono">${formatEurDisplay(invoice.amount_ttc)} €</span>
      </div>
    </div>

    <div class="legal-footer">
      <strong>Mentions légales belges &amp; TVA :</strong><br/>
      Facture émise conformément au Code de la TVA belge (AR n° 1, art. 5). Prestataire : Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique.<br/>
      Paiement reçu intégralement — aucune retenue ni escompte applicable. Conditions générales B2B consultables sur www.aegissolaire.com/cgv.
    </div>
  </div>
</body>
</html>`
}
