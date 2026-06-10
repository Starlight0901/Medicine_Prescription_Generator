# Medicine Prescription Generator

A single-doctor prescription management web application built with **React** and **Vite**. Doctors can manage patients, create and store prescriptions, search history, configure profile assets, and export professional PDF prescriptions — all running client-side with **localStorage** today, structured for future **Firebase** integration.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Pages & Routing](#pages--routing)
- [Data Models](#data-models)
- [Service Layer](#service-layer)
- [Authentication](#authentication)
- [PDF Generation](#pdf-generation)
- [Branding Assets](#branding-assets)
- [Local Storage Keys](#local-storage-keys)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Future Roadmap](#future-roadmap)

---

## Features

### Patient Management
- Add, edit, and delete patients
- Fields: name, date of birth, gender, phone (optional)
- Search patients by name
- Patient selection modal when creating prescriptions

### Prescription Management
- Create prescriptions with diagnosis, medicines, and notes
- **Save & Generate PDF** in one step (new prescriptions)
- View prescription history with search and date filters (day / month / year)
- Edit, delete, and re-download PDFs from history
- Medicines support: name, dosage, frequency, duration

### Settings
- Doctor name (required)
- Signature image URL
- Seal image URL

### Dashboard
- Patient and prescription counts
- Recent prescriptions overview
- Quick action links

### PDF Export
- A4-format prescription PDFs via `pdf-lib`
- Embedded logo and RX icon (not external links)
- Gradient prescription border (olive green → light blue → dark blue)
- Patient info, diagnosis, medicine table, notes, signature, and seal

### Authentication (Mock)
- Login / logout with route protection
- Session persisted in localStorage
- Ready to swap for Firebase Auth later

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 19 (JavaScript) |
| Build | Vite 6 |
| Routing | React Router 7 |
| PDF | pdf-lib |
| Persistence | localStorage (browser) |
| Styling | Custom CSS (glass / medical minimal aesthetic) |

**Not yet integrated:** Firebase, backend API, cloud storage.

---

## Architecture

The app follows a layered architecture so the UI never talks to `localStorage` directly. All data flows through a unified API abstraction designed for a future Firebase swap.

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer                                                   │
│  Pages · Components · Context (Auth, Settings)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  apiService.js          ← single public data API              │
│  authService.js         ← mock authentication                 │
│  pdf/pdfService.js      ← PDF generation & download           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Domain Services                                            │
│  patientsService · prescriptionService · settingsService    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  storageService.js      ← localStorage read/write           │
└─────────────────────────────────────────────────────────────┘
```

### Context Providers

| Provider | Purpose |
|----------|---------|
| `AuthProvider` | Global auth state (`user`, `login`, `logout`) |
| `SettingsProvider` | Global settings state (`settings`, `updateSettings`) |

### Layout Structure

```
App
├── Login (public)
└── ProtectedRoute
    └── Layout
        ├── Sidebar + Bottom Nav (navigation)
        ├── AppHeader (logo left · RX icon right)
        └── Main content (page outlet)
```

---

## Project Structure

```
src/
├── assets/              # Bundled static assets (RX_icon.png)
├── components/
│   ├── ui/              # Reusable UI (Card, etc.)
│   ├── AppHeader.jsx    # Top branding bar
│   ├── Navbar.jsx       # Sidebar + mobile bottom nav
│   ├── PatientForm.jsx
│   ├── PatientSelectionModal.jsx
│   ├── PrescriptionForm.jsx
│   ├── PrescriptionDetail.jsx
│   ├── ProtectedRoute.jsx
│   ├── RxIcon.jsx
│   └── RxBrand.jsx
├── context/
│   ├── AuthContext.jsx
│   └── SettingsContext.jsx
├── data/
│   ├── branding.js      # LOGO_PATH, RX_ICON_PATH
│   ├── constants.js     # Routes, storage keys, nav items
│   └── seedData.js      # Default settings + sample data
├── pages/
│   ├── Dashboard.jsx
│   ├── Patients.jsx
│   ├── NewPrescription.jsx
│   ├── History.jsx
│   ├── Settings.jsx
│   └── Login.jsx
├── services/
│   ├── apiService.js    # Unified data API (use this from UI)
│   ├── authService.js
│   ├── patientsService.js
│   ├── prescriptionService.js
│   ├── settingsService.js
│   ├── storageService.js
│   └── pdf/
│       ├── pdfService.js
│       └── index.js
└── utils/
    ├── dateUtils.js
    ├── idGenerator.js
    ├── prescriptionFilters.js
    ├── prescriptionFormUtils.js
    └── rxIconProcessor.js

public/
├── logo.png             # Main branding logo
└── RX_icon.png          # RX symbol (also copied to src/assets)
```

---

## Pages & Routing

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Public sign-in page |
| `/` | Dashboard | Overview and quick actions |
| `/patients` | Patients | Patient CRUD and search |
| `/prescriptions/new` | New Prescription | Create prescription + PDF |
| `/history` | History | Browse, filter, edit, delete, re-export |
| `/settings` | Settings | Doctor profile and image URLs |

Protected routes redirect unauthenticated users to `/login`.

---

## Data Models

### Patient

```json
{
  "id": "patient-abc123",
  "name": "John Doe",
  "dateOfBirth": "1992-06-10",
  "gender": "Male",
  "phone": "+1 555-1001",
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

### Prescription

```json
{
  "id": "rx-abc123",
  "patientId": "patient-001",
  "patientName": "John Doe",
  "diagnosis": "Acute bronchitis",
  "medicines": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "Three times daily",
      "duration": "5 days"
    }
  ],
  "notes": "Increase fluid intake and rest.",
  "createdAt": "2026-04-01T16:45:00.000Z"
}
```

### Settings

```json
{
  "doctorName": "Dr. Jane Smith",
  "signatureImageUrl": "https://example.com/signature.png",
  "sealImageUrl": "https://example.com/seal.png"
}
```

### Auth Session

```json
{
  "id": "user-001",
  "email": "doctor@gmail.com",
  "name": "Dr. Jane Smith",
  "role": "doctor",
  "loggedInAt": "2026-06-10T12:00:00.000Z"
}
```

Sample patients and prescriptions are seeded automatically on first load.

---

## Service Layer

### `apiService.js` — use this from all UI code

| Method | Description |
|--------|-------------|
| `getPatients()` | List all patients |
| `savePatient(patient)` | Create (no `id`) or update (with `id`) |
| `deletePatient(id)` | Remove a patient |
| `getPrescriptions()` | List all prescriptions (newest first) |
| `savePrescription(prescription)` | Create or update by `id` |
| `deletePrescription(id)` | Remove a prescription |
| `getSettings()` | Read doctor settings |
| `updateSettings(settings)` | Save doctor settings |

### `authService.js`

| Method | Description |
|--------|-------------|
| `login(email, password)` | Authenticate mock user |
| `logout()` | Clear session |
| `getCurrentUser()` | Get session user or `null` |
| `isAuthenticated()` | Boolean session check |

### PDF Service

| Method | Description |
|--------|-------------|
| `generatePrescriptionPDF({ prescription, settings, patient })` | Build PDF bytes |
| `downloadPrescriptionPDF(...)` | Generate and trigger browser download |
| `downloadPdf(pdfBytes, filename)` | Generic download helper |

---

## Authentication

Mock authentication is in place for development. No Firebase or external auth is used yet.

**Demo credentials**

| Field | Value |
|-------|-------|
| Email | `doctor@gmail.com` |
| Password | `password123` |

`ProtectedRoute` guards all app pages. `AuthContext` exposes auth state globally via the `useAuth()` hook.

---

## PDF Generation

Prescriptions are exported as **A4 PDFs** (595 × 842 pt) using `pdf-lib`.

### Header Layout

```
┌──────────────────────────────────────────────────┐
│  [Logo]                          [RX Icon]       │
│                                  Date: ...      │
├──────────────────────────────────────────────────┤
│  Patient Information                            │
│  Diagnosis                                      │
│  Medicines (table)                              │
│  Prescription Notes                             │
│  ─────────────────────────────────────────────  │
│  Doctor name (small)   Signature    Seal         │
└──────────────────────────────────────────────────┘
```

### PDF Features
- Logo embedded top-left (`/logo.png`)
- RX icon embedded top-right (processed for visibility)
- Date aligned under the RX icon
- 2px gradient border around the prescription
- Signature and seal images loaded before generation (with placeholders on failure)
- Images are embedded into the PDF, not linked externally

### Image Loading
All images (logo, RX icon, signature, seal) are preloaded with `Promise.all` before the PDF is built. External signature/seal URLs fall back to generated placeholders if they fail to load (e.g. CORS).

---

## Branding Assets

| Asset | Path | Usage |
|-------|------|-------|
| Main logo | `public/logo.png` → `/logo.png` | App header (left), login, PDF (top-left) |
| RX icon | `src/assets/RX_icon.png` + `public/RX_icon.png` | App header (right), login, PDF (top-right) |

`rxIconProcessor.js` normalizes the RX icon for display on light backgrounds (UI and PDF).

**UI sizing (approximate)**
- Logo: 4.5rem mobile / 5.5rem desktop
- RX icon: ~32px (subtle, smaller than logo)

**PDF sizing (approximate)**
- Logo height: 96pt
- RX icon height: 32pt

---

## Local Storage Keys

| Key | Content |
|-----|---------|
| `dpm_patients` | Patient array |
| `dpm_prescriptions` | Prescription array |
| `dpm_settings` | Doctor settings object |
| `dpm_seeded` | Boolean — first-run seed flag |
| `dpm_auth_session` | Logged-in user object |

Clear these keys in browser DevTools to reset all app data.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repository-url>
cd Medicine_Prescription_Generator
npm install
```

### Development

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

Sign in with the demo credentials above.

### Production Build

```bash
npm run build
npm run preview
```

Static output is written to `dist/`.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Future Roadmap

The codebase is structured for incremental backend integration:

1. **Firebase Auth** — replace `authService.js` internals; keep `AuthContext` and `ProtectedRoute`
2. **Firebase Firestore** — replace `apiService.js` internals; keep all UI unchanged
3. **Cloud storage** — host signature/seal images in Firebase Storage or similar
4. **Multi-user / roles** — extend auth and data models as needed

To migrate data access, only the service layer implementations need to change — not pages or components.

---

## License

See [LICENSE](LICENSE) for details.
