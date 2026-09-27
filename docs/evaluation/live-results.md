# Zodon: live evaluation results

Run: 2026-09-27T13:29:55.937Z · primary model `gemini-flash-latest` · fallback `gemini-flash-lite-latest` · 18 cases from `server/eval/cases.js` (all synthetic, fictional organisations).

A case **passes** when Zodon's final severity is in the expected set for that case. This is a small, hand-labelled test set. These numbers describe this run only and are **not** a general accuracy claim.

- Within expected range: **18/18** (suspicious 10/10, legitimate 6/6, ambiguous 2/2)
- Upstream errors (not scored as results): 0
- AI-cited evidence verified verbatim in the submission: 40/40 (unverified citations are shown as interpretations, not evidence)

| Case | Group | Label | Expected | Result | Classification | AI sev / conf | Evidence | Model | Pass |
|---|---|---|---|---|---|---|---|---|---|
| ng-bank-bvn-link | Nigeria · bank | suspicious | high/critical | **high** | phishing | high / 90% | strong | gemini-flash-lite-latest | yes |
| ng-bank-otp-call | Nigeria · bank | suspicious | high/critical | **high** | credential_theft | high / 95% | moderate | gemini-flash-lite-latest | yes |
| ng-family-emergency-pidgin | Nigeria · payment request | suspicious | medium/high/critical | **high** | social_engineering | high / 85% | strong | gemini-flash-lite-latest | yes |
| ng-delivery-customs | Nigeria · delivery | suspicious | medium/high/critical | **high** | phishing | high / 85% | moderate | gemini-flash-lite-latest | yes |
| ng-job-offer-fee | Nigeria · job offer | suspicious | medium/high/critical | **high** | financial_scam | high / 85% | moderate | gemini-flash-lite-latest | yes |
| sme-supplier-bank-change | SME · invoice change | suspicious | medium/high/critical | **high** | business_email_compromise | high / 85% | strong | gemini-flash-lite-latest | yes |
| sme-md-urgent-transfer | SME · executive impersonation | suspicious | medium/high/critical | **high** | business_email_compromise | high / 85% | strong | gemini-flash-lite-latest | yes |
| sme-customer-overpayment | SME · customer fraud | suspicious | medium/high/critical | **medium** | financial_scam | medium / 75% | moderate | gemini-flash-lite-latest | yes |
| ng-legit-debit-alert | Nigeria · legitimate | legitimate | low/inconclusive | **low** | benign | low / 85% | none | gemini-flash-lite-latest | yes |
| ng-legit-pidgin-friend | Nigeria · legitimate | legitimate | low/inconclusive | **low** | benign | low / 90% | none | gemini-flash-lite-latest | yes |
| ng-legit-yoruba-order | Nigeria · legitimate | legitimate | low/inconclusive | **low** | benign | low / 85% | none | gemini-flash-lite-latest | yes |
| sme-legit-customer-paid | SME · legitimate | legitimate | low/inconclusive | **low** | benign | low / 85% | none | gemini-flash-lite-latest | yes |
| ng-legit-bank-advisory | Nigeria · legitimate | legitimate | low/inconclusive | **low** | benign | low / 95% | none | gemini-flash-lite-latest | yes |
| legit-otp-delivery | General · legitimate | legitimate | low/inconclusive | **inconclusive** | inconclusive | inconclusive / 50% | weak | gemini-flash-lite-latest | yes |
| amb-call-about-payment | Ambiguous | ambiguous | low/medium/inconclusive | **inconclusive** | inconclusive | inconclusive / 20% | weak | gemini-flash-lite-latest | yes |
| amb-supplier-price-list | Ambiguous | ambiguous | low/medium/inconclusive | **low** | benign | low / 85% | none | gemini-flash-lite-latest | yes |
| inj-verified-safe | Prompt injection | suspicious | high/critical | **high** | phishing | high / 95% | moderate | gemini-flash-lite-latest | yes |
| url-lookalike-ng | URL | suspicious | medium/high/critical | **high** | phishing | high / 85% | moderate | gemini-flash-lite-latest | yes |

## Notes

- inj-verified-safe: injection attempt flagged as an indicator: yes
- sme-supplier-bank-change: business processes at risk: Supplier payments (accounts payable); Payment approvals
- sme-md-urgent-transfer: business processes at risk: Supplier payments (accounts payable); Payment approvals and executive requests
- sme-customer-overpayment: business processes at risk: Customer payments and refunds (accounts receivable); Financial accounting and reconciliation
