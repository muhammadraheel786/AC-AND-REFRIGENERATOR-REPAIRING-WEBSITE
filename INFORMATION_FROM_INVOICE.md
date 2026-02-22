# Information Taken From the Invoice Image

This document lists all information extracted from the **Cash/Credit Invoice** template image and used in the التكيف التبريد (A/C & Refrigeration) website and backend.

---

## 1. Business identity & branding

| Field | English | Arabic |
|-------|---------|--------|
| **Company name** | A/C & Refrigeration | للتكييف والتبريد |
| **Location** | Al-Dieya - Kingdom of Saudi Arabia | الصناعية - المملكة العربية السعودية |
| **Contact number** | 0582618038 | 0582618038 |

- Used in: `config/settings.py` (COMPANY_NAME_EN, COMPANY_NAME_AR, COMPANY_PHONE, COMPANY_LOCATION, COMPANY_LOCATION_AR), footer, header, contact page, and invoice PDF.

---

## 2. Services (for booking system & service catalog)

- **English (from invoice):** Repairing AC - Refrigerator, Washing Machine - Split - Central A/C  
- **Arabic (from invoice):** إصلاح المكيفات والثلاجات والغسالات أفران - بردة - مركزي وسبليت  

From this we use:

- AC (split & central) – إصلاح المكيفات، سبليت، مركزي  
- Refrigerator – الثلاجات  
- Washing machine – الغسالات  
- **Ovens** – أفران (from Arabic line)  
- **Cold storage / Chillers** – بردة (from Arabic line)  

These map to service categories: `ac`, `refrigerator`, `washing_machine`, `oven`, `cold_storage`, plus general appliance fitting.

---

## 3. Invoice structure (for invoice generation)

All fields in the digital invoice match the paper template:

| Field | English | Arabic |
|-------|---------|--------|
| Invoice type | Cash / Credit Invoice | فاتورة نقداً / بالدين |
| Invoice number | No. | رقم |
| Date | Date | التاريخ |
| Customer | Mr. / Messers | المطلوب من المكرم |
| Table headers | DESCRIPTION | البيان |
| | QTY. | العدد |
| | UNIT PRICE | السعر الفرادي |
| | TOTAL AMOUNT | السعر الاجمالي |
| Grand total | Total S.R. | المجموع |
| Signatures | Receiver / Salesman | توقيع المستلم / توقيع البائع |

- Currency: **Saudi Riyals (SR / ريال)**.  
- Implemented in: `bookings/invoice.py` (bilingual PDF with the same layout and labels).

---

## 4. Multilingual & RTL

- The invoice is bilingual (Arabic right, English left), which matches the site requirement: **Arabic (default, RTL)** and **English**, plus Urdu.  
- Used for: UI language switcher, invoice PDF, notifications (Arabic/English/Urdu where applicable).

---

## 5. Payment context

- Invoice type “Cash / Credit” aligns with:  
  - **Online:** Mada, STC Pay, Credit/Debit (PayTabs).  
  - **Offline:** Cash/credit at job site.  
- Total S.R. is the amount charged and stored in SAR for payments and invoices.

---

## 6. Visual reference

- Header images on the invoice (indoor/outdoor AC unit, washing machine) are used as inspiration for **service icons or imagery** on the website (e.g. service cards, booking step for “Select service & appliance”).

---

## Summary

- **Company:** A/C & Refrigeration / للتكييف والتبريد, 0582618038, Al-Dieya (Industrial) – Dammam, Saudi Arabia.  
- **Services:** AC (split/central), Refrigerator, Washing machine, Ovens, Cold storage (+ appliance fitting).  
- **Invoice:** Cash/Credit, No., Date, Customer, DESCRIPTION / QTY / UNIT PRICE / TOTAL, Total S.R., Receiver & Salesman.  
- **Currency:** SAR.  
- **Design:** Bilingual (AR/EN), RTL for Arabic; extended to Urdu on the website.
