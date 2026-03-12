# MedSync - Replit Configuration

## Overview

MedSync is a medical authorization platform for healthcare professionals in Brazil. It streamlines medical order management for OPME (Orthoses, Prostheses, and Special Materials), patient records, hospital administration, and insurance card processing using advanced OCR. The platform aims to simplify authorization workflows, improve data accuracy, and enhance communication between healthcare providers and insurance companies, thereby reducing administrative burden and accelerating patient care. The business vision is to become the leading platform for medical authorizations in Brazil, offering significant market potential by improving efficiency and reducing costs in the healthcare sector.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **Styling**: TailwindCSS with Shadcn/ui and Radix UI primitives.
- **State Management**: Tanstack React Query.
- **UI/UX Decisions**: Professional, clean, and intuitive interface with a comprehensive theme system (light/dark mode, Sky color palette default). Features include responsive dashboards with real-time statistics, enhanced surgical calendar with drag-and-drop, standardized components, custom fonts (Proxima Nova, Nunito), interactive subscription plan cards, and a guided 3-step registration flow integrated with Stripe Checkout. All static assets are managed by Vite in `client/src/assets/`.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Processing**: Google Cloud Vision API for OCR and React-PDF for report generation.
- **Core Architectural Decisions**: Modular design, fully relational data model, batch saving pattern for user actions, automated workflows (form pre-population, status transitions), strict business rule enforcement, optimized data loading via parallel API calls, unified folder structure (`/uploads/orders/[ID]/`), normalized integer-based order status, flexible pricing architecture (promotional pricing), selective removal system for surgical procedures, and Docker containerization. Authentication flow reorganized with `/` as auth landing and `/welcome` as post-login dashboard. Relational routes for CIDs, OPME, suppliers, and CBHPM procedures are separated for better organization.
- **Registration Flow (Feb 2026 migration)**: Paid plan registration uses `incomplete_registrations` table first (no user created until payment confirmed). Trial (planId=1) creates user immediately. Stripe webhook `handleRegTokenBasedRegistration` materializes the user after `checkout.session.completed`. Legacy `handlePendingPaymentFlow` kept for backward compatibility and trial_upgrade flow.
- **CPF Auto-fill (Feb 2026)**: Registration form auto-fills data from previous incomplete registrations when user enters matching firstName + CPF (POST `/api/incomplete-registration/lookup`). Rate-limited to 5 attempts/60s per IP. Password never returned.
- **Stripe Customer Dedup (Feb 2026)**: `createOrUpdateCustomer` in stripeProvider.ts searches for existing Stripe customer by email before creating a new one. Prevents duplicate customers across retried registrations.
- **Subscription Uniqueness (Feb 2026)**: `createUserSubscription` in storage.ts checks for existing subscription before inserting. If one exists for the user, it updates instead of creating a duplicate. Guarantees one subscription per user.
- **Incomplete Registration Merge (Feb 2026)**: `createIncompleteRegistration` performs intelligent merge when updating existing records by email. All table fields (password, regToken, leadStatus, billingInterval, CRM, address, etc.) are explicitly preserved during merge — not lost to JSON overflow. Uses allowlist-based field separation.
- **Checkout Success (Feb 2026)**: `/api/payments/checkout-success` endpoint supports both `userId` and `regToken` metadata lookup from Stripe sessions, enabling the new registration flow to find materialized users after webhook processing.
- **PDF-based Preview V3 (Feb 2026)**: Order preview replaced HTML-based V2 with PDF-based V3 (`order-preview_v3.tsx`). Uses `usePdfPreview` hook to generate actual PDF blob client-side via `@react-pdf/renderer`'s `pdf()` function with debounce (500ms), cancellation, and URL cleanup. Displays PDF in iframe via `PdfViewer` component. Guarantees 100% visual parity between preview and downloaded PDF. Page break controls use collapsible section list with IDs matching `OrderPDFDocumentV2`'s `shouldBreakBefore` block IDs. V2 preserved as fallback.


### Database Architecture
- **ORM**: Drizzle with full TypeScript support.
- **Database**: PostgreSQL 16.
- **Migrations**: Drizzle Kit.
- **Relationships**: Fully relational design with foreign keys and cascade delete, including many-to-many relationships via association tables.
- **Key Tables**: Medical orders, patients, hospitals, order statuses, CIDs, CBHPM procedures, OPME items, suppliers, surgical procedures, surgical approaches, clinical justifications, surgery appointments, anatomical regions. Includes full audit system for patient records (7 audit fields) and standardized `insuranceProviderId` for patient-provider linking.

### Deployment and Environment Configuration
- **Multi-Environment Support**: Flexible deployment across Replit, production, staging, and development.
- **Environment Variables**: Uses `APP_PROTOCOL`, `APP_DOMAIN`, `APP_PORT`, `NODE_ENV` with auto-detection for Replit.
- **CORS Configuration**: Automatic inclusion of localhost and configured base URL, with optional custom origins.
- **Stripe Integration**: Automated generation of correct Stripe callback URLs.
- **Environment Validation**: Automatic configuration validation on startup.

## External Dependencies

- **Google Cloud Services**: Vision API (for OCR).
- **Database Services**: Neon Database (PostgreSQL hosting).
- **Email Services**: Mailto-based (opens user's local email client; SendGrid removed Mar 2026).
- **UI Libraries**: Radix UI (primitives), React-beautiful-dnd (drag and drop).