# Phase 1: Foundation - Detailed Tasks

## 1. Project Setup
- [ ] **Initialize Next.js App**
    - Command: `npx create-next-app@latest . --typescript --tailwind --eslint`
    - Clean up default boilerplate code.
- [ ] **Install Core Dependencies**
    - `npm install convex @clerk/nextjs @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react`
    - `npm install -D shadcn-ui` (or initialize shadcn via CLI)

## 2. Backend Setup (Convex + Clerk)
- [ ] **Initialize Convex**
    - `npx convex dev`
- [ ] **Configure Clerk**
    - Set up Clerk application in Clerk Dashboard (User to provide keys or we use placeholders initially).
    - Create `.env.local` with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
    - Create `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.
- [ ] **Integrate Auth**
    - Create `ConvexClientProvider.tsx` to wire up Convex with Clerk.
    - Add `auth.config.ts` for Convex.

## 3. Database Schema
- [ ] **Define User Schema**
    - Create `convex/users.ts` functions (store user data on login).
    - Update `convex/schema.ts`.

## 4. UI Foundation & Theming
- [ ] **Setup ShadCN**
    - Run `npx shadcn-ui@latest init`
- [ ] **Implement Theming Engine**
    - Update `app/globals.css` with the CSS variable structure defined in PROJECT_PLAN.md.
    - Create `lib/theme` utilities if needed.
- [ ] **Create Basic Layout**
    - `app/layout.tsx`: Root layout with Providers.
    - `app/(dashboard)/layout.tsx`: Dashboard layout with Sidebar.

## 5. Monitoring
- [x] **Setup Sentry**
    - `npx @sentry/wizard@latest -i nextjs`
