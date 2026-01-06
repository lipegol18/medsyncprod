# MedSync - Replit Configuration

## Overview

MedSync is a medical authorization platform for healthcare professionals in Brazil. It streamlines medical order management for OPME (Orthoses, Prostheses, and Special Materials), patient records, hospital administration, and insurance card processing using advanced OCR. The platform aims to simplify authorization workflows, improve data accuracy, and enhance communication between healthcare providers and insurance companies, thereby reducing administrative burden and accelerating patient care. The business vision is to become the leading platform for medical authorizations in Brazil, offering significant market potential by improving efficiency and reducing costs in the healthcare sector.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with Shadcn/ui component library, Radix UI primitives
- **State Management**: Tanstack React Query for server state management
- **UI/UX Decisions**:
    - Professional, clean interface with intuitive navigation.
    - Color-coded visual indicators for status and urgency.
    - Modern circular icon designs and consistent layouts (e.g., two-column forms, skeleton loading states).
    - Comprehensive theme system with light mode as default (Sky color palette) and dark mode as an option.
    - **Official MedSync Color Palette**: #2ca8e0 (primary), #36a9e1, #124a6b, #6e6f70.
    - Responsive dashboard design with real-time statistical cards.
    - Enhanced surgical calendar with fixed-height grid layout, precise appointment positioning, and visual indicators.
    - Standardized button and modal theming.
    - Proxima Nova and Nunito fonts.
    - Interactive subscription plan cards with hover effects and selection states.
    - Enhanced 3-step registration flow (Form → Plans → Confirmation → Payment) with a comprehensive data review screen before finalization via Stripe Checkout.
    - **CSS Architecture**: Complete CSS variable system with theme support, semantic status colors, calendar variables, and utility classes.
    - **Static Assets Architecture**: All static assets (icons, images) are managed by Vite bundler in `client/src/assets/` with TypeScript imports for compile-time verification.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Google Cloud Vision API for OCR
- **PDF Generation**: React-PDF renderer for medical reports
- **Core Architectural Decisions**:
    - **Modular Design**: Services are modular, e.g., document extraction service.
    - **Relational Data Model**: Fully relational database design with foreign keys.
    - **Batch Saving Pattern**: Data collected and saved in batches on explicit user actions.
    - **Automated Workflow**: Automation for form pre-population, status transitions, and scheduling prompts.
    - **Strict Business Rule Enforcement**: Prevents incomplete orders, restricts status transitions, enforces one appointment per order.
    - **Optimized Data Loading**: Utilizes parallel API calls (Promise.all) for efficient loading.
    - **Unified Folder Structure**: Standardized folder structure (`/uploads/orders/[ID]/`) with consistent subfolders and intelligent PDF management.
    - **Status System Normalization**: Order status migrated to an integer foreign key.
    - **Flexible Pricing Architecture**: Supports temporal promotional pricing with automatic reversion to full price.
    - **Selective Removal System**: Allows removal of surgical procedures while preserving shared data.
    - **Docker Containerization**: Complete Docker setup for build/deployment.
    - **Authentication Flow**: Reorganized with `/` as auth landing and `/welcome` as post-login dashboard.
    - **Relational Routes Architecture**: Separated relational routes in `server/relational-routes.ts` and `server/relational-services.ts` for managing CIDs, OPME, suppliers, and CBHPM procedures, registered via `app.use('/api', relationalRoutes)` before main routes.

### Database Architecture
- **ORM**: Drizzle with full TypeScript support
- **Database**: PostgreSQL 16
- **Migrations**: Drizzle Kit
- **Relationships**: Fully relational design with foreign keys and cascade delete.
- **Key Tables**: Medical orders, patients, hospitals, order statuses, CIDs, CBHPM procedures, OPME items, suppliers, surgical procedures, surgical approaches, clinical justifications, surgery appointments, anatomical regions. Many-to-many relationships are managed via association tables.
- **Anatomical Region Persistence**: Medical orders include `anatomicalRegionId` foreign key, with full end-to-end persistence and visual feedback.
- **Complete Audit System**: Patient records have full lifecycle tracking with 7 audit fields: `created_at`, `created_by`, `updated_at`, `updated_by`, `is_deleted`, `deleted_at`, and `deleted_by` for full accountability and LGPD/ISO 27001 compliance.

### Deployment and Environment Configuration
- **Multi-Environment Support**: Flexible deployment across Replit, production, staging, and development environments.
- **Environment Variables**: Uses `APP_PROTOCOL`, `APP_DOMAIN`, `APP_PORT`, `NODE_ENV` for configuration, with auto-detection for Replit.
- **CORS Configuration**: Automatically includes localhost and configured base URL, with optional custom origins.
- **Stripe Integration**: Automatically generates correct Stripe callback URLs based on the environment. Stripe webhooks must be updated manually upon server migration.
- **Environment Validation**: System automatically validates configuration on startup (e.g., production must use HTTPS).
- **Configuration Helper**: `server/utils/environment.ts` provides utility functions for environment checks and URL generation.

## External Dependencies

- **Google Cloud Services**:
    - **Vision API**: For OCR processing.
- **Database Services**:
    - **Neon Database**: PostgreSQL hosting.
- **Email Services**:
    - **SendGrid**: For email notifications.
- **UI Libraries**:
    - **Radix UI**: Primitives for UI components.
    - **React-beautiful-dnd**: For drag and drop functionality.

## Technical Notes

### Onboarding Tour System
- **Library**: React Joyride for guided tours
- **Architecture**: Independent modular system in `client/src/features/onboarding/`
- **Components**:
    - `OnboardingProvider`: Context provider with Joyride integration, wraps the app
    - `useOnboarding`: Hook for tour control (startTour, stopTour, isTourCompleted)
    - `TourTooltip`: Custom tooltip component with MedSync styling
    - Tours defined in `tours/` folder (e.g., `profileTour.ts`)
- **Storage**: Completed tours persisted in localStorage (`medsync_onboarding_completed_tours`)
- **Profile Tour Steps**: Header intro, Logo section, Signature section, CRM card section, Signature note explanation, Save button
- **Dashboard Tour Steps**: Welcome, Total pedidos, Aguardando envio, Aguardando agendamento, Autorizados, Pendências, Aguardando recurso, Novo pedido button, Novo paciente button, Gráfico distribuição, Agenda cirúrgica
- **Patients Tour Steps**: Header, Filtros de busca, Botão novo paciente (com explicação completa do formulário)
- **Create Order Tour Steps** (18 total):
  - **Wizard Step 1** (5 steps): Header, Progress bar, Seleção de paciente, Seleção de hospital, Navegação
  - **Wizard Step 2** (2 steps): Indicação Clínica, Anexos/OCR
  - **Wizard Step 3** (7 steps): Região Anatômica, Procedimento Cirúrgico, Lateralidade, Caráter, Campos Auto-preenchidos, Justificativa com IA, Próximos Passos
  - **Wizard Step 4** (2 steps): Visualização do Pedido, Navegação para PDF
  - **Wizard Step 5** (2 steps): PDF Gerado, Download e Envio
- **Tour-Wizard Synchronization**: Tours can include `metadata.wizardStep` to control which wizard step should be active. The create-order page registers a listener that automatically switches wizard steps as the tour progresses, and restores the original step when the tour ends.
- **Targeting**: Uses `data-testid` attributes on profile page elements for tour step targets
- **Tour Menu Location**: Dashboard (home.tsx) - dropdown menu "Tours de Ajuda" in header banner
- **Visibility**: Tour menu visible only for doctors (roleId === 2)
- **Navigation**: Selecting a tour navigates to the corresponding page and starts the tour automatically

### Observation Notes System (Additional Notes)
- **Subtitle Format**: `### [Procedimento] → [Conduta]` (human-readable, no IDs visible)
- **Association Key**: Uses procedure name + approach name for grouping observations with their respective items
- **Backward Compatibility**: Supports legacy format `### [Procedimento] → [Conduta] [PID:x][AID:y]` for existing data
- **Automatic Cleanup**: When a procedure+conduct combination is removed, the corresponding observation sections are automatically removed from all 3 text fields (CBHPM, OPME, Suppliers)
- **Helper Functions**:
    - `removeSubtitleSection`: Removes a specific section from observation text based on procedure and approach names
    - `removeObservationSectionsForApproach`: Orchestrates removal across all 3 observation fields
- **Implementation Files**:
    - `client/src/steps/surgery-data.tsx`: Subtitle insertion on conduct selection, automatic cleanup on removal
    - `client/src/pages/create-order.tsx`: Preview parsing and display (Step 4)
    - `client/src/components/order-pdf-document.tsx`: PDF generation with observations