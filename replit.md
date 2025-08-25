# MedSync - Replit Configuration

## Overview

MedSync is a comprehensive medical authorization platform for healthcare professionals in Brazil. It manages medical orders for OPME, patient records, hospital management, and insurance card processing with advanced OCR capabilities. The platform aims to streamline medical authorization workflows, improve data accuracy, and enhance communication between healthcare providers and insurance companies, ultimately reducing administrative burden and accelerating patient care.

## Recent Changes (August 2025)

- **Complete Theme System Implementation**: Fully implemented theme system across entire application with dark/light mode switching
- **Enhanced Header Design**: Updated header with white background, sky-400 text color (lighter tone), and font-weight 500 (medium) for improved visual balance
- **Active Navigation State**: Replaced underline indicators with sky-500 background blocks and white text for better visual contrast and modern appearance
- **Theme Architecture**: Header uses `bg-primary` and `text-primary-foreground`, all components converted from hardcoded colors to CSS theme variables
- **Custom Sky Classes**: Added `.btn-sky`, `.text-sky`, `.border-sky`, `.bg-sky` classes for consistent Sky palette usage in light theme
- **Create Order Page Enhancement**: Added horizontal sky-200 bar spanning from "Novo Pedido Cirúrgico" title to breadcrumbs section with white text for optimal contrast
- **Selective Removal System**: Implemented intelligent removal system for surgical procedures with shared data preservation between procedures (CIDs, CBHPM, OPME, suppliers)
- **Automatic CID Update Fix**: Resolved issue where CID-10 codes weren't updating automatically when procedures with single surgical approach were auto-selected
- **Password Reset**: Completed password reset for user "danielpozzatti" and "lipegol18"  
- **System Status**: All major functionality verified working correctly including selective removal APIs and automatic procedure selection
- **Progressive Breadcrumbs**: Implemented modern breadcrumb system with continuous progress line that fills based on current step, centered layout with step 3 aligned to page center
- **Theme System Compliance**: Converted all hardcoded colors (sky-400, gray-300, etc.) to CSS theme variables (--accent, --muted, --muted-foreground) ensuring full light/dark mode compatibility
- **Docker Containerization**: Complete Docker setup implemented including Dockerfile, docker-compose.yml, nginx configuration, health check endpoint, and automated build/deployment scripts for external container execution
- **Authentication Flow Restructure**: Reorganized authentication flow with `/` as auth landing page and `/welcome` as post-login dashboard
- **Button Theme Standardization**: Applied consistent button styling across home page using variant="outline", border-border, and proper theme-compliant hover states
- **Complete Modal Theme Standardization**: Converted all modal components to theme system including surgery-data dialogs, status-change-modal, partial-approval-modal, and received-values-modal
- **Modal Color Consistency**: Replaced hardcoded colors (text-green-600 dark:text-green-400, bg-blue-, etc.) with theme-compliant variants (text-emerald-600, bg-primary, text-primary-foreground)
- **Shadow and Border Updates**: Standardized modal shadows and borders using border-border, bg-popover, and theme-compliant shadow classes
- **Patient Form Dialog Theming**: Fully converted patient modal dialog from slate/blue hardcoded colors to complete theme system integration
- **Order Details Page Theming**: Complete conversion of `/order-details.tsx` from extensive blue/green/red hardcodes to theme-compliant color system (bg-card, text-foreground, text-emerald-600, text-destructive, etc.) ensuring visual consistency with other pages
- **Text Primary Standardization**: Converted all `text-primary` instances to `text-primary-foreground` and unified all secondary text colors to `text-foreground` for enhanced contrast and readability across light/dark themes
- **Theme System Inversion**: Changed default theme from dark to light mode as primary, with dark mode as secondary option. Light theme now uses Sky color palette as the main design system

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with Shadcn/ui component library, Radix UI primitives
- **State Management**: Tanstack React Query for server state management
- **UI/UX Decisions**: Focus on a professional, clean interface with intuitive navigation. Uses color-coded visual indicators for status and urgency (e.g., green for authorized, red for urgent/emergency). Employs modern circular icon designs and clear, consistent layouts (e.g., two-column forms, skeleton loading states, simplified naming in reports). Dynamic date fields and status-specific information display enhance user experience.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Google Cloud Vision API for OCR
- **PDF Generation**: React-PDF renderer for medical reports
- **Core Architectural Decisions**:
    - **Modular Design**: Services are modular, e.g., document extraction service.
    - **Relational Data Model**: Fully relational database design with foreign keys for data integrity.
    - **Batch Saving Pattern**: Implemented for complex forms (e.g., medical order creation) where data is collected and saved in batches on explicit user actions ("Próximo", "Salvar e Sair") rather than on every field change.
    - **Automated Workflow**: Extensive use of automation for tasks like form pre-population (CBHPM procedures, OPME items, suppliers, clinical justifications based on medical procedures and conducts), status transitions, and appointment scheduling prompts.
    - **Strict Business Rule Enforcement**: Examples include preventing incomplete orders from being sent for analysis, restricting status transitions (e.g., "cirurgia_realizada" to "recebido" only), and enforcing one appointment per medical order.
    - **Optimized Data Loading**: Utilizes parallel API calls (Promise.all) for efficient loading of complex relational data in edit mode to prevent race conditions and improve performance.
    - **Unified Folder Structure**: Standardized folder structure for medical order files (e.g., `/uploads/orders/[ID]/`) with consistent subfolders (`exames/`, `laudos/`, `documentos/`) and intelligent PDF management (distinguishing user-uploaded vs. system-generated PDFs).
    - **Status System Normalization**: Migration of order status from text enum to an integer foreign key for performance and data integrity.

### Database Architecture
- **ORM**: Drizzle with full TypeScript support
- **Database**: PostgreSQL 16
- **Migrations**: Drizzle Kit
- **Relationships**: Fully relational design with foreign keys and cascade delete for data consistency.
- **Key Tables**: Medical orders, patients, hospitals, order statuses, CIDs, CBHPM procedures, OPME items, suppliers, surgical procedures, surgical approaches, clinical justifications, surgery appointments. Many-to-many relationships are managed via association tables (e.g., `medical_order_surgical_approaches`, `surgical_approach_opme_items`).

## External Dependencies

- **Google Cloud Services**:
    - **Vision API**: For OCR processing (e.g., insurance card extraction).
- **Database Services**:
    - **Neon Database**: PostgreSQL hosting (production).
- **Email Services**:
    - **SendGrid**: For email notifications.
- **UI Libraries**:
    - **Radix UI**: Primitives for UI components.
    - **React-beautiful-dnd**: For drag and drop functionality in calendars.