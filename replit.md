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
- **Email Services**: SendGrid (for email notifications).
- **UI Libraries**: Radix UI (primitives), React-beautiful-dnd (drag and drop).