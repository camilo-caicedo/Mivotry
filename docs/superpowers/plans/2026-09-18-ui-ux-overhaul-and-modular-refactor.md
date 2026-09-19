# Mivotry UI/UX Overhaul & Modular Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Mivotry into a tier-one, Apple/Linear-grade personal finance application with a modernized OLED dark palette, double-bezel haptic cards, fluid spring animations, and refactor the monolithic `App.tsx` (2,778 lines) into clean, decoupled screens and hooks.

**Architecture:** 
- A unified Design System in `src/theme/` (colors, typography, spacing, motion).
- Haptic micro-interaction primitives in `src/components/common/` (`AnimatedPressable`, `GlassCard`, `ScreenHeader`, `FloatingTabBar`).
- Decoupled business logic in `src/hooks/` (`useDashboardData`, `useModalManager`).
- Independent screen modules in `src/screens/` (`DashboardScreen`, `ManejoScreen`, `BolsillosScreen`, `AdminScreen`).
- A clean, slim `App.tsx` (< 200 lines) that serves as the root shell.

**Tech Stack:** React Native 0.86.3, React 19.2.3, Expo SDK 57.0.24, `lucide-react-native`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage`, `react-native-svg`.

---

## Global Constraints
- **Zero Native Breaking Changes:** Do NOT install libraries requiring unlinked native code that would break the running Expo Go session.
- **Strict TypeScript:** Run `npx tsc --noEmit` after every task. 0 errors allowed.
- **Preserve All Business Logic:** Google Sheets syncing, calculations for Q15/Q30, Bonos, Salidas, Primas, Deudas, and SMS detection must remain 100% intact.
- **Design Standard:** Apple Fluid Interfaces & High-End Agency Aesthetics:
  - Background: `#060D0F` (deep obsidian slate).
  - Cards: Double-bezel concentric radii, subtle inner top border highlight `rgba(255, 255, 255, 0.05)`.
  - Spring-driven touch feedback: Scale down to `0.97` on press with instant response.
  - Accent colors: Refined Emerald (`#10B981`), Violet (`#8B5CF6`), Amber (`#F59E0B`), Coral Rose (`#F43F5E`).

---

## Task Decomposition

### Task 1: Design System & Tokens Engine (`src/theme/`)

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/theme/typography.ts`
- Create: `src/theme/spacing.ts`
- Create: `src/theme/motion.ts`
- Create: `src/theme/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ThemeColors {
    background: string;
    surface1: string;
    surface2: string;
    surfaceBorder: string;
    surfaceHighlight: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    accentMint: string;
    accentMintLight: string;
    accentMintMuted: string;
    accentViolet: string;
    accentVioletLight: string;
    accentVioletMuted: string;
    accentGold: string;
    accentGoldLight: string;
    accentGoldMuted: string;
    accentRose: string;
    accentRoseLight: string;
    accentRoseMuted: string;
    accentSky: string;
  }
  export const theme: {
    colors: ThemeColors;
    typography: typeof typography;
    spacing: typeof spacing;
    radius: typeof radius;
    motion: typeof motion;
  };
  ```

- [ ] **Step 1: Create `src/theme/colors.ts`**
  Define the obsidian dark palette with high-contrast surfaces, luminous pastel accents, and transparent glass overlays.
- [ ] **Step 2: Create `src/theme/typography.ts`, `spacing.ts`, `motion.ts`**
  Define type scale, font weights, letter-spacing, concentric squircle border-radii (`sm: 10`, `md: 14`, `lg: 18`, `xl: 22`, `pill: 9999`), and spring animation timing.
- [ ] **Step 3: Create `src/theme/index.ts`**
  Export the consolidated `theme` object.
- [ ] **Step 4: Verify with TypeScript**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 2: Core Haptic UI Primitives (`src/components/common/`)

**Files:**
- Create: `src/components/common/AnimatedPressable.tsx`
- Create: `src/components/common/GlassCard.tsx`
- Create: `src/components/common/ScreenHeader.tsx`
- Create: `src/components/common/FloatingTabBar.tsx`

**Interfaces:**
- Consumes: `theme` from `src/theme`
- Produces:
  - `<AnimatedPressable onPress scale={0.97}>`: Spring-animated touch wrapper.
  - `<GlassCard variant="default" | "elevated" | "accent">`: Double-bezel card with subtle concentric borders and optional glow.
  - `<ScreenHeader onCharts onTransfer onHistory onRefresh onInbox unreadInboxCount>`: Top brand header with live status pill and icon cluster.
  - `<FloatingTabBar activeTab onTabChange>`: Floating bottom navigation bar with active pill indicator and haptic press.

- [ ] **Step 1: Create `src/components/common/AnimatedPressable.tsx`**
  Implements `Animated.Value` scale on `onPressIn` (scale: 0.97) and `onPressOut` (scale: 1) with spring physics (`useNativeDriver: true`).
- [ ] **Step 2: Create `src/components/common/GlassCard.tsx`**
  Double-bezel architecture: outer shell with hairline border and inner core with top highlight.
- [ ] **Step 3: Create `src/components/common/ScreenHeader.tsx`**
  Modern detached header with app logo, live title, and quick action icon buttons (`PieChart`, `ArrowLeftRight`, `History`, `RefreshCw`, `Inbox` with unread notification pill).
- [ ] **Step 4: Create `src/components/common/FloatingTabBar.tsx`**
  Floating pill navbar at the bottom (`Dashboard`, `Manejo`, `Chat`, `Bolsillos`, `Ajustes`) with active spring indicator.
- [ ] **Step 5: Verify with TypeScript**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 3: State & Modal Hooks Decoupling (`src/hooks/`)

**Files:**
- Create: `src/hooks/useDashboardData.ts`
- Create: `src/hooks/useModalManager.ts`

**Interfaces:**
- Produces:
  ```ts
  export function useDashboardData(): {
    loading: boolean;
    refreshing: boolean;
    dashboardData: DashboardResponse | null;
    activeQuincena: 15 | 30;
    setActiveQuincena: (q: 15 | 30) => void;
    activeAccount: 'nomina' | 'bonos';
    setActiveAccount: (a: 'nomina' | 'bonos') => void;
    onRefresh: () => Promise<void>;
    fetchDashboard: (force?: boolean) => Promise<void>;
    handleCargarQuincena: (q: 15 | 30) => Promise<void>;
  };

  export function useModalManager(): {
    modals: ModalStateMap;
    openModal: (name: ModalName, payload?: any) => void;
    closeModal: (name: ModalName) => void;
    closeAll: () => void;
  };
  ```

- [ ] **Step 1: Create `src/hooks/useDashboardData.ts`**
  Extract data fetching, caching with `cacheService`, quincena loading, and pull-to-refresh logic from `App.tsx`.
- [ ] **Step 2: Create `src/hooks/useModalManager.ts`**
  Consolidate the 10+ modal states (`sms`, `inbox`, `history`, `charts`, `transfer`, `salidas`, `bonos`, `quickAction`, `prima`, `gastoManual`) into a single structured hook.
- [ ] **Step 3: Verify with TypeScript**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 4: Screen Extraction - `DashboardScreen.tsx`

**Files:**
- Create: `src/screens/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `theme`, `useDashboardData`, `useModalManager`, `GlassCard`, `AnimatedPressable`, `DueDateAlertBanner`, `QuickActionsWidget`, `BonosCompactCard`.
- Props:
  ```ts
  export interface DashboardScreenProps {
    dashboardData: DashboardResponse | null;
    activeQuincena: 15 | 30;
    setActiveQuincena: (q: 15 | 30) => void;
    onCargarQuincena: (q: 15 | 30) => void;
    onOpenInbox: () => void;
    onOpenSalidas: () => void;
    onOpenBonos: () => void;
    onOpenPrima: () => void;
    onSelectQuickAction: (action: QuickActionItem) => void;
    onNewQuickAction: () => void;
    onExpenseCategoryPress: (gasto: GastoItem, cuenta: 'nomina' | 'bonos') => void;
  }
  ```

- [ ] **Step 1: Implement `DashboardScreen.tsx` layout**
  - Pending notifications banner (if unread > 0).
  - Due date smart alert banner (`DueDateAlertBanner`).
  - Hero Balance Card: Big balance in mint gradient, burn-rate daily budget calculation, day 15/30 segmented toggle, and Cargar Q button.
  - Quick Actions Ribbon (`QuickActionsWidget`).
  - Fondo de Salidas & Ocio card.
  - Tarjeta de Bonos compact card.
  - Bolsillos & Ahorros snapshot card.
  - Deudas & Cuotas snapshot card.
  - Pagos Anuales & Primas snapshot card.
  - Tarjetas de Crédito list.
  - Streaming Services list.
- [ ] **Step 2: Apply double-bezel cards and typography**
  Replace old dark teal styles with `theme` tokens and concentric squircles.
- [ ] **Step 3: Verify with TypeScript**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 5: Screen Extraction - `ManejoScreen.tsx`, `BolsillosScreen.tsx`, `AdminScreen.tsx`

**Files:**
- Create: `src/screens/ManejoScreen.tsx`
- Create: `src/screens/BolsillosScreen.tsx`
- Create: `src/screens/AdminScreen.tsx`

**Interfaces:**
- `ManejoScreen`: Category list breakdown with budget progress bars, segmented control for Nómina vs Bonos, and tap-to-expense action.
- `BolsillosScreen`: Detailed view of Fondo Ocasional / Vacaciones, Inversiones, Fondo de Primas Semestrales con barra de progreso anual, y deudas Occidente.
- `AdminScreen`: Google Sheets connection info, cache clearing, and app diagnostics.

- [ ] **Step 1: Implement `src/screens/ManejoScreen.tsx`**
  Extract Nómina / Bonos categories view, clean search bar, and progress cards.
- [ ] **Step 2: Implement `src/screens/BolsillosScreen.tsx`**
  Extract pockets, investments, annual payments, and debt control cards.
- [ ] **Step 3: Implement `src/screens/AdminScreen.tsx`**
  Extract admin options, Google Sheets connection status, and cache management.
- [ ] **Step 4: Verify with TypeScript**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 6: Modernize Existing Widgets & Visual Polish

**Files:**
- Modify: `src/components/BonosCompactCard.tsx`
- Modify: `src/components/SalidasDetailModal.tsx`
- Modify: `src/components/QuickActionsWidget.tsx`
- Modify: `src/components/ChatAssistant.tsx`

**Interfaces:**
- Integrate `theme` tokens (Obsidian canvas, concentric radii, spring animations, refined text contrast).

- [ ] **Step 1: Polish `BonosCompactCard.tsx` & `QuickActionsWidget.tsx`**
  Align cards with new double-bezel styling and haptic press feel.
- [ ] **Step 2: Polish `SalidasDetailModal.tsx` & `ChatAssistant.tsx`**
  Enhance message bubbles, bottom sheets, and analytical charts with smooth colors.
- [ ] **Step 3: Verify with TypeScript**
  Run `npx tsc --noEmit` and confirm 0 errors.

---

### Task 7: Refactor `App.tsx` into Clean Shell

**Files:**
- Modify: `App.tsx` (Reduce from 2,778 lines to < 220 lines)

**Interfaces:**
- Consumes: `useDashboardData`, `useModalManager`, `ScreenHeader`, `FloatingTabBar`, `DashboardScreen`, `ManejoScreen`, `BolsillosScreen`, `AdminScreen`, `ChatAssistant`, and modal components.

- [ ] **Step 1: Refactor `App.tsx`**
  Connect `useDashboardData` and `useModalManager`. Render `ScreenHeader`, current screen based on `activeTab`, `FloatingTabBar`, and modals.
- [ ] **Step 2: Verify full compilation**
  Run `npx tsc --noEmit` and verify zero errors.
- [ ] **Step 3: Git Commit & Push**
  Commit the entire modular architecture and design overhaul to `master`.
