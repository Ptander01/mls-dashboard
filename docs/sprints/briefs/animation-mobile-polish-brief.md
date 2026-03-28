# Sprint Brief: Animation Polish & Mobile Responsiveness

## 1. Context & Objective
The MLS Analytics Dashboard currently has strong desktop-first styling and a few high-impact animations (like the Z-axis assembly). However, Vercel analytics show that **53% of users are on mobile devices**. Currently, the dashboard has almost zero responsive CSS, causing tab navigation overflow, cramped charts, and unusable sidebars on small screens.

Simultaneously, while some animations are great, others need polish: the splash screen lacks a loading state, tab transitions are abrupt, and the theme toggle's global CSS transition causes UI jank on complex charts.

**The Objective:** Execute a dual-track polish sprint to make the dashboard fully responsive on mobile devices while smoothing out the rough edges in the animation system.

## 2. Track A: Animation Polish

### 2.1 Splash Screen Refinement (`SplashIntro.tsx`)
**Problem:** The splash screen shows a fallback image while the video loads, but there's no loading indicator, and the transition from fallback to video is harsh.
**Implementation:**
- Add a minimalist loading spinner or progress bar overlay during the fallback state.
- Implement a smooth crossfade (opacity transition) when the video finishes buffering and replaces the fallback image.
- Ensure the "Skip" button has a smooth hover state and fades out cleanly.

### 2.2 Tab Transition Smoothing (`Home.tsx` & `TabSkeleton.tsx`)
**Problem:** When switching tabs, the `<Suspense>` boundary shows the `TabSkeleton`, but when the lazy-loaded chunk finishes, the skeleton instantly disappears and the new content snaps in.
**Implementation:**
- Wrap the `<Suspense>` boundary in an `AnimatePresence` to crossfade between the `TabSkeleton` and the loaded `TabContent`.
- Ensure the `StaggerContainer` entrance animation triggers *after* the skeleton fades out, creating a seamless handoff.

### 2.3 Theme Toggle Jank Fix (`index.css`)
**Problem:** The global theme transition (`html, html * { transition-property: background-color... }`) is too broad and causes performance jank when toggling themes on pages with complex DOM trees.
**Implementation:**
- Remove the global `*` selector transition.
- Apply theme transitions specifically via CSS variables or targeted classes (e.g., `.neu-raised`, `.neu-flat`, `.glass-panel`, `.text-primary`).
- Ensure the 3D toggle pill itself retains its smooth 0.6s physics.

### 2.4 Accessibility: Reduced Motion
**Problem:** The dashboard currently ignores OS-level accessibility preferences.
**Implementation:**
- Add a `@media (prefers-reduced-motion: reduce)` block to `index.css` that disables or significantly speeds up all keyframe animations (shimmer, float-in, slide-up-fade, etc.).
- Update Framer Motion configurations to respect `prefers-reduced-motion` (e.g., using `useReducedMotion` hook).

## 3. Track B: Mobile Responsiveness

### 3.1 Responsive Tab Navigation (`Home.tsx`)
**Problem:** The 6 tab buttons use `whitespace-nowrap` and overflow the screen on mobile.
**Implementation:**
- **Mobile (<768px):** Convert the tab bar to a horizontally scrollable container (`overflow-x-auto`, `snap-x`, hide scrollbar). Ensure the active tab snaps into view.
- **Alternative (if scroll is clunky):** Drop the text labels on mobile and show only the icons, keeping all 6 visible.

### 3.2 Mobile Filter Drawer (`FilterPanel.tsx`)
**Problem:** The fixed left sidebar (280px) takes up too much room and the toggle button blocks content on mobile.
**Implementation:**
- **Desktop (>=1024px):** Keep the current slide-out sidebar behavior.
- **Mobile (<1024px):** Convert the Filter Panel into a bottom sheet or a full-screen modal overlay. Move the toggle button to the top navigation bar (next to the theme toggle) on mobile.

### 3.3 Responsive Grid Layouts
**Problem:** Most chart containers use fixed heights and widths.
**Implementation:**
- Update `TabSkeleton.tsx` and all tab components (`Attendance.tsx`, `PlayerStats.tsx`, etc.) to use responsive grids (e.g., `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`).
- Ensure `NeuCard` containers have `min-h-[300px]` instead of fixed heights, allowing them to grow based on content.

### 3.4 Chart Container Scaling
**Problem:** SVG charts (BumpChart, Attendance bars) have hardcoded dimensions.
**Implementation:**
- Wrap SVG charts in a `ResponsiveContainer` (if using Recharts) or implement a `useResizeObserver` hook to dynamically set SVG `viewBox` and dimensions based on the parent container's width.
- Ensure tooltips are constrained within the viewport bounds on mobile (`max-width: 90vw`, `overflow-wrap: break-word`).

## 4. Execution Rules
1. **Mobile-First CSS:** Use Tailwind's default mobile-first approach. Base classes apply to mobile, use `md:`, `lg:`, `xl:` for desktop overrides.
2. **Do Not Break Desktop:** The dashboard looks great on large screens. Ensure the responsive updates do not compress or alter the desktop layout (>=1024px).
3. **Test Touch Targets:** Ensure all interactive elements (buttons, toggles, chart nodes) have a minimum touch target size of 44x44px on mobile.
4. **No Heavy Dependencies:** Do not add new animation libraries. Use the existing Framer Motion and CSS keyframes.

## 5. Acceptance Criteria
- [ ] Splash screen has a loading indicator and smooth crossfade to video.
- [ ] Tab switching crossfades smoothly between the skeleton and the loaded content.
- [ ] Theme toggling does not cause layout jank or stuttering.
- [ ] Tab navigation is fully usable on screens as narrow as 375px (iPhone SE).
- [ ] Filter panel functions as a modal/drawer on mobile.
- [ ] All charts render without horizontal overflow on mobile devices.
