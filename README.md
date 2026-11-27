# Gold Rate Calculator

A single-page, mobile-friendly gold jewellery price calculator with live rates fetched from [Devi Jewellers](https://devijewellers.lk/) and full manual rate customization.

![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue?style=flat-square)
![Theme](https://img.shields.io/badge/Theme-Light%20Luxury-gold?style=flat-square)

---

## Features

- **Live Market Rates (8g Sovereign Base)**: Automatically fetches today's 22KT and 24KT 8g rates in LKR directly from the top header and API of Devi Jewellers Sri Lanka (`devijewellers.lk`).
- **Grams (g) & Milligrams (mg)**:
  - Input directly in **Grams (`g`)** or **Milligrams (`mg`)**.
  - Real-time conversion bar (`g • mg`).
- **Karat Support**:
  - `22KT`: Live rate from Devi Jewellers (with manual override option).
  - `24KT`: Live rate from Devi Jewellers (with manual override option).
  - `21KT`: Custom manual rate set in Settings.
  - `18KT`: Custom manual rate set in Settings.
- **Seller's Price Comparison**:
  - Enter the seller's quoted price in LKR.
  - Automatically calculates and displays the exact difference (**Extra Charged by Seller** or **Discount**) in both LKR and percentage (`+ LKR X (+Y%)`).
- **Making Charges (Crafting / Wastage)**:
  - Toggle between **Percentage (`%`)** or **Fixed Amount (`LKR`)**.
- **Quote Breakdown & Export**:
  - Itemized display: Total Jewel Cost, Base Gold Value, Making Charges, Effective Rate per Gram, Effective Rate per Milligram, and Seller Difference.
  - **Copy Quote**: One-tap copy to clipboard formatted for WhatsApp, messaging, or invoices.
- **Settings Modal**:
  - Dedicated controls for manual 8g rates (24K, 22K, 21K, 18K).
  - Persistent state saved to `localStorage`.
- **Minimal, Distraction-Free UX**:
  - Zero redundant taglines or helper labels.
  - High-contrast, clean light theme with warm gold accents.

---

## How to Run

Because this is built with standard vanilla web technologies (HTML5, CSS3, JavaScript), no build tools or package managers are required.

### Quick Start

Open `index.html` directly in your browser:
```bash
open index.html
```

Or start a local development server:
```bash
python3 -m http.server 3000
```
Then navigate to [http://localhost:3000](http://localhost:3000).
