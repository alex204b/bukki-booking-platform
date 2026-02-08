# Responsive Design Guide for BUKKi App

## Overview

This guide shows you how to create different layouts for phones, tablets, and desktops.

---

## Quick Reference: Tailwind Breakpoints

```
default (no prefix) = Mobile (0px - 639px)
sm:                 = Small screens (640px+) - Large phones
md:                 = Medium screens (768px+) - Tablets
lg:                 = Large screens (1024px+) - Laptops
xl:                 = Extra Large (1280px+) - Desktops
2xl:                = Huge screens (1536px+) - Large monitors
```

**Mobile-First Approach:** Start with mobile styles, then add larger screen styles.

---

## Approach 1: Tailwind CSS Classes (Easiest)

### Example: Responsive Layout

```tsx
<div className="
  flex flex-col        // Mobile: stack vertically
  md:flex-row          // Tablet+: side by side
  gap-4                // Mobile: 16px gap
  lg:gap-8             // Laptop+: 32px gap
">
  <div className="
    w-full             // Mobile: full width
    md:w-1/2           // Tablet+: half width
    p-4                // Mobile: 16px padding
    lg:p-8             // Laptop+: 32px padding
  ">
    Sidebar
  </div>

  <div className="
    w-full             // Mobile: full width
    md:w-1/2           // Tablet+: half width
  ">
    Main Content
  </div>
</div>
```

### Example: Responsive Text & Spacing

```tsx
<div className="
  text-sm              // Mobile: small text
  md:text-base         // Tablet: normal text
  lg:text-lg           // Desktop: large text

  p-3                  // Mobile: 12px padding
  md:p-4               // Tablet: 16px padding
  lg:p-6               // Desktop: 24px padding

  space-y-2            // Mobile: 8px vertical spacing
  md:space-y-4         // Tablet+: 16px spacing
">
  Content
</div>
```

### Common Responsive Patterns

```tsx
// Grid: 1 column mobile, 2 tablet, 3 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide on mobile, show on desktop
<div className="hidden lg:block">Desktop Only</div>

// Show on mobile, hide on desktop
<div className="block lg:hidden">Mobile Only</div>

// Different image sizes
<img className="w-full md:w-1/2 lg:w-1/3" />

// Responsive button
<button className="
  w-full md:w-auto        // Full width mobile, auto desktop
  py-3 md:py-2            // Taller on mobile
  text-base md:text-sm    // Larger text on mobile
">
  Button
</button>
```

---

## Approach 2: Hide/Show Components

Use `hidden` and `block` utilities:

```tsx
import React from 'react';

const MyPage: React.FC = () => {
  return (
    <>
      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <MobileHeader />
        <MobileNavigation />
        <MobileContent />
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <DesktopHeader />
        <div className="flex">
          <DesktopSidebar />
          <DesktopContent />
        </div>
      </div>
    </>
  );
};
```

---

## Approach 3: JavaScript Detection with Hooks

Use the custom hooks I created:

### useScreenSize Hook

```tsx
import { useScreenSize } from '../hooks/useScreenSize';

const MyComponent: React.FC = () => {
  const { isMobile, isTablet, isDesktop, screenSize, width } = useScreenSize();

  return (
    <div>
      {isMobile && (
        <div>Mobile Layout</div>
      )}

      {isDesktop && (
        <div>Desktop Layout</div>
      )}

      {/* Or use screenSize */}
      {screenSize === 'mobile' && <MobileView />}
      {screenSize === 'tablet' && <TabletView />}
      {screenSize === 'desktop' && <DesktopView />}
    </div>
  );
};
```

### usePlatform Hook

```tsx
import { usePlatform } from '../hooks/usePlatform';

const MyComponent: React.FC = () => {
  const { isNative, isWeb, isAndroid, isIOS } = usePlatform();

  return (
    <div>
      {isNative && (
        <div>
          {/* Native app UI - Full screen, larger touch targets */}
          <button className="w-full py-4 text-lg">
            Native Button
          </button>
        </div>
      )}

      {isWeb && (
        <div>
          {/* Web UI - Constrained width, normal buttons */}
          <button className="px-6 py-2 text-base">
            Web Button
          </button>
        </div>
      )}

      {isAndroid && <div>Android-specific features</div>}
      {isIOS && <div>iOS-specific features</div>}
    </div>
  );
};
```

---

## Real Example: Fixing BusinessList Page

Here's how to make BusinessList responsive:

```tsx
// Before: Fixed layout
<div className="grid grid-cols-3 gap-4">
  {businesses.map(b => <Card />)}
</div>

// After: Responsive layout
<div className="
  grid
  grid-cols-1           // 1 column on mobile
  sm:grid-cols-2        // 2 columns on large phones
  lg:grid-cols-3        // 3 columns on laptops
  xl:grid-cols-4        // 4 columns on large screens
  gap-3                 // Small gap mobile
  lg:gap-6              // Large gap desktop
">
  {businesses.map(b => <Card />)}
</div>
```

---

## Real Example: Responsive Navigation

```tsx
const Layout: React.FC = () => {
  const { isMobile } = useScreenSize();

  return (
    <div>
      {/* Mobile: Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
          <div className="flex justify-around py-2">
            <NavButton icon={Home} label="Home" />
            <NavButton icon={Search} label="Search" />
            <NavButton icon={User} label="Profile" />
          </div>
        </nav>
      )}

      {/* Desktop: Sidebar Navigation */}
      {!isMobile && (
        <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r">
          <div className="p-4 space-y-2">
            <NavLink icon={Home} label="Home" />
            <NavLink icon={Search} label="Search" />
            <NavLink icon={User} label="Profile" />
          </div>
        </nav>
      )}

      <main className={isMobile ? 'pb-16' : 'ml-64'}>
        {/* Content */}
      </main>
    </div>
  );
};
```

---

## Testing Your Responsive Design

### In Web Browser (Chrome DevTools):
1. Press F12 to open DevTools
2. Click the device toggle icon (or Ctrl+Shift+M)
3. Select different devices: iPhone, iPad, Desktop
4. Test your layouts

### In Android Studio:
1. Use emulators with different screen sizes:
   - Phone: Pixel 5 (1080x2340)
   - Tablet: Pixel Tablet (2560x1600)
2. Test on your real device
3. Check landscape and portrait modes

---

## Common Design Issues & Fixes

### Issue 1: Text Too Small on Mobile
```tsx
// Bad
<p className="text-xs">Text</p>

// Good - Mobile first, then smaller on desktop
<p className="text-sm md:text-xs">Text</p>
```

### Issue 2: Elements Too Cramped on Mobile
```tsx
// Bad
<div className="p-1 gap-1">

// Good
<div className="p-4 gap-4 md:p-2 md:gap-2">
```

### Issue 3: Images Too Large on Mobile
```tsx
// Bad
<img className="w-full h-96" />

// Good
<img className="w-full h-48 md:h-64 lg:h-96" />
```

### Issue 4: Horizontal Scroll on Mobile
```tsx
// Bad - Fixed width
<div className="w-[1200px]">

// Good - Responsive width
<div className="w-full max-w-7xl mx-auto px-4">
```

---

## Mobile-First Design Checklist

- [ ] Touch targets at least 44x44px (buttons, links)
- [ ] Text size at least 16px to prevent zoom on iOS
- [ ] Adequate spacing (min 16px padding/margin)
- [ ] Images optimized for mobile
- [ ] Forms with large inputs and labels
- [ ] Navigation accessible with one hand
- [ ] Content readable without zooming
- [ ] No horizontal scrolling

---

## Example: Converting Existing Page to Responsive

### Step 1: Identify Fixed Sizes
Look for:
- Fixed widths: `w-64`, `w-[500px]`
- Fixed text: `text-xl` without breakpoints
- Fixed padding: `p-8` without breakpoints

### Step 2: Add Mobile-First Classes
```tsx
// Before
<div className="w-96 p-8 text-xl">

// After
<div className="
  w-full md:w-96      // Full width mobile, fixed on tablet+
  p-4 lg:p-8          // Small padding mobile, large on laptop+
  text-base lg:text-xl // Normal mobile, large on laptop+
">
```

### Step 3: Test on Different Sizes
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1280px width

---

## Best Practices

1. **Start Mobile-First:** Design for mobile, then add desktop features
2. **Use Tailwind Breakpoints:** They're already configured and work great
3. **Test on Real Devices:** Emulators are good, real phones are better
4. **Touch-Friendly:** Buttons should be easy to tap (min 44x44px)
5. **Readable Text:** Don't go below text-sm on mobile
6. **Consistent Spacing:** Use spacing scales (p-2, p-4, p-6, not random values)

---

## Quick Wins for Your App

1. **BusinessList Page:** Make card grid responsive (1/2/3 columns)
2. **Chat Page:** Stack conversation list on top for mobile
3. **Profile Page:** Full-width cards on mobile, sidebar on desktop
4. **Forms:** Full-width inputs on mobile, constrained on desktop
5. **Navigation:** Bottom nav on mobile, sidebar on desktop

---

## Resources

- [Tailwind Responsive Design Docs](https://tailwindcss.com/docs/responsive-design)
- Test the ResponsiveExample component I created
- Use Chrome DevTools device mode for testing
- Check your hooks: `useScreenSize` and `usePlatform`
