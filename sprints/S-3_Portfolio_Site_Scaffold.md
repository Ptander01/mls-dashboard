# Sprint Brief: S-3 Portfolio Site Scaffold

**Epic:** S-3 Portfolio Update
**Goal:** Initialize the Next.js 15 App Router scaffold for the "PTA Geospatial Intelligence" portfolio site, establish the design system bridging from the MLS Dashboard aesthetic, and configure the Vercel deployment pipeline.

## 1. Context & Motivation

With the S-0 (logos) phase wrapping up, the "PTA Geospatial Intelligence" brand identity is established. The brand features a deep navy, cyan/teal, and brushed steel aesthetic that aligns perfectly with the MLS Dashboard's "Dark Forge Industrial Neumorphism." 

The portfolio site will serve as the primary showcase for the MLS Dashboard, acting as a professional wrapper that presents the dashboard as a flagship project. It requires a modern, highly performant foundation. This sprint (S-3) focuses purely on the architectural scaffolding, design system translation, and deployment plumbing using Next.js 15 App Router, Tailwind CSS 4, and Vercel.

## 2. Technical Implementation Plan

### Step 1: Next.js 15 App Router Scaffolding
Initialize a new Next.js 15 project in a separate repository to maintain a clean boundary between the portfolio site and the MLS Dashboard. The project will utilize the App Router architecture and React 19.

The application code will be organized using the `src/` directory convention. Route definitions will reside in `src/app/`, while reusable UI elements will be placed in `src/components/`. Utility functions and shared logic will go into `src/lib/`, and global CSS along with design tokens will be stored in `src/styles/`. 

The initial routing structure must establish the base pages: the home/about page at `/`, the project showcase at `/projects`, and contact information at `/contact`.

### Step 2: Design System Translation
Bridge the "Dark Forge Industrial Neumorphism" from the MLS Dashboard to the new portfolio site, adapting it for the "PTA Geospatial Intelligence" brand.

The color palette must incorporate the S-0 logo colors into the Tailwind configuration. The primary background will utilize deep navy tones (`#0a1628` to `#121220`), with cyan/teal (`#5aacbc` to `#00d4ff`) as the primary accent. The secondary amber accent (`#e8a838`) from the dashboard will be carried over for continuity. Surfaces will reflect brushed steel and neumorphic dark variants (`#252538`).

For typography, configure Google Fonts to use **Space Grotesk** for primary headings and **JetBrains Mono** for monospace data elements. The core CSS variables from the dashboard's dark theme must be ported over to establish the neumorphic card styles, inset shadows, and glassmorphic overlays.

### Step 3: Animation Foundation
Set up the animation library to ensure smooth page transitions and component reveals, matching the cinematic feel of the dashboard.

Install and configure `framer-motion` as the primary animation library. Implement an `<AnimatePresence>` wrapper in a client-side layout component to enable smooth route transitions, such as fade or slide effects. Additionally, create a reusable `<StaggerItem>` or `<FadeIn>` component to handle staggered entry animations on page load.

### Step 4: Vercel Deployment Configuration
Configure the deployment pipeline to ensure the portfolio site is live, optimized, and monitored.

Deploy the application to Vercel, ensuring the build settings align with Next.js 15 requirements. Integrate `@vercel/analytics` and `@vercel/speed-insights` within the root layout to track performance and user engagement. Finally, configure any necessary environment variables in the Vercel dashboard to support contact forms or external APIs.

## 3. Verification & Acceptance

| Requirement | Acceptance Criteria |
| :--- | :--- |
| **Scaffolding** | Next.js 15 App Router project is successfully initialized and runs locally without errors. |
| **Design System** | Tailwind CSS is configured with the "PTA Geospatial Intelligence" color palette and typography. |
| **Routing & Animation** | Basic routing (`/`, `/projects`, `/contact`) is functional with Framer Motion page transitions. |
| **Styling** | Neumorphic design tokens (CSS variables) are successfully ported and applied to a test component. |
| **Deployment** | The site is successfully deployed to Vercel, with Analytics and Speed Insights active. |

## 4. AI Developer Instructions

When executing this sprint, do not modify the existing MLS Dashboard repository. This sprint is strictly about scaffolding a new Next.js project for the portfolio site. 

Ensure the directory structure strictly follows Next.js 15 App Router best practices, completely avoiding the legacy `pages/` directory. When porting the design system, focus exclusively on the Dark Theme variables from the dashboard, as they align best with the S-0 logo aesthetic featuring deep navy and metallic tones. Keep the initial components minimal; the goal of this sprint is scaffolding and architecture, not content population.
