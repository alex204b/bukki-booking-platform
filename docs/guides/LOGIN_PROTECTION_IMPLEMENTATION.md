# 🔒 Login Protection Implementation Guide

## Summary
This document describes the comprehensive anti-brute-force protection system for the login page.

## ✅ What's Already Done

### Backend Protection (Already Implemented in `main.ts`)
- ✅ **Rate Limiting**: 20 requests per 15 minutes on `/auth/login`
- ✅ **IP-based tracking**: Using `trust proxy` setting
- ✅ **Standard headers**: Sends rate limit info to clients

### Frontend Hook Created (`useLoginProtection.ts`)
- ✅ **Progressive lockout**: 5 attempts before 15-minute lockout
- ✅ **Minimum delay**: 2 seconds between attempts
- ✅ **Persistent state**: Survives page refreshes via localStorage
- ✅ **Auto-unlock**: Automatically unlocks after lockout period

---

## 📝 Required Changes to `Login.tsx`

### 1. Add Imports (Lines 1-13)

**Add these imports:**
```typescript
import { AlertTriangle, Shield } from 'lucide-react';
import { useLoginProtection } from '../hooks/useLoginProtection';
```

**Full import block should be:**
```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap, User, Phone, ChevronDown, ArrowLeft, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { api, authService, authApi } from '../services/api';
import toast from 'react-hot-toast';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../config/firebase';
import { ConnectionErrorModal } from '../components/ConnectionErrorModal';
import { LoginBackground } from '../components/LoginBackground';
import { authStorage } from '../utils/authStorage';
import { useLoginProtection } from '../hooks/useLoginProtection';
```

---

### 2. Initialize the Hook (After line 77)

**Add after `const from = location.state?.from?.pathname || '/';`:**

```typescript
  // Login protection hook - prevents brute force attacks
  const loginProtection = useLoginProtection({
    maxAttempts: 5, // Lock after 5 failed attempts
    lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
    minTimeBetweenAttempts: 2000, // 2 seconds between attempts
  });
```

---

### 3. Update `handleLoginSubmit` Function (Line 143)

**Replace the function with:**

```typescript
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CHECK 1: Verify user is allowed to attempt login
    const { allowed, waitTime } = loginProtection.canAttemptLogin();
    if (!allowed) {
      if (loginProtection.isLocked) {
        toast.error(
          `Too many failed attempts. Please wait ${loginProtection.formatRemainingTime()} before trying again.`,
          { duration: 5000, icon: '🔒' }
        );
      } else if (waitTime) {
        toast.error(
          `Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`,
          { duration: 3000 }
        );
      }
      return; // Block the login attempt
    }

    setLoginLoading(true);

    try {
      console.log('[LOGIN] Starting login process...');
      const result = await login(email, password);
      console.log('[LOGIN] Login successful, result:', result);

      // Record successful login - resets the counter
      loginProtection.recordSuccessfulAttempt();

      // ... rest of the existing success handling code ...
      // (Keep all the business owner redirect logic)

      console.log('[LOGIN] Navigating to:', from);
      navigate(from, { replace: true });
      setLoginLoading(false);

    } catch (error: any) {
      console.error('[LOGIN] Login error:', error);

      // CHECK 2: Record failed attempt for invalid credentials
      if (error.response?.status === 401) {
        loginProtection.recordFailedAttempt();

        const remaining = loginProtection.remainingAttempts - 1;
        if (remaining > 0 && remaining <= 3) {
          // Show warning when 3 or fewer attempts remain
          toast.error(
            `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
            { duration: 4000, icon: '⚠️' }
          );
        } else if (remaining === 0) {
          // User is now locked out
          toast.error(
            `Too many failed attempts. Account locked for 15 minutes.`,
            { duration: 5000, icon: '🔒' }
          );
        } else {
          toast.error(error.response?.data?.message || 'Invalid credentials');
        }
        setLoginLoading(false);
        return;
      }

      // CHECK 3: Handle server rate limiting
      if (error.response?.status === 429 || error.message?.includes('Too many requests')) {
        loginProtection.recordFailedAttempt();
        toast.error('Too many login attempts. Please wait before trying again.', {
          duration: 5000,
          icon: '🔒',
        });
      }
      // ... keep existing error handlers (network errors, etc.) ...

      setLoginLoading(false);
    }
  };
```

---

### 4. Add Security Warnings to Form (Line 568, before email input)

**Add this JSX right BEFORE the email input field:**

```tsx
{/* Security Warning Messages */}
{loginProtection.isLocked && (
  <div className="bg-red-500/20 border border-red-500 rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 mb-3">
    <Shield className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm sm:text-base font-semibold text-red-100">Account Temporarily Locked</p>
      <p className="text-xs sm:text-sm text-red-200 mt-1">
        Too many failed attempts. Please wait <strong>{loginProtection.formatRemainingTime()}</strong>
      </p>
    </div>
  </div>
)}

{!loginProtection.isLocked && loginProtection.attempts > 0 && loginProtection.remainingAttempts <= 3 && (
  <div className="bg-yellow-500/20 border border-yellow-500 rounded-2xl p-3 flex items-start gap-2 mb-3">
    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-yellow-200">
      <strong>{loginProtection.remainingAttempts}</strong> attempt{loginProtection.remainingAttempts === 1 ? '' : 's'} remaining before 15-minute lockout
    </p>
  </div>
)}
```

---

### 5. Disable Inputs When Locked (Lines 570 & 582)

**Email input - add `disabled` prop:**
```tsx
<input
  type="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  disabled={loginProtection.isLocked}  {/* ADD THIS */}
  placeholder={t('emailAddress') || 'E-mail'}
  className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base text-center sm:text-left placeholder:text-center sm:placeholder:text-left disabled:opacity-50 disabled:cursor-not-allowed"
/>
```

**Password input - add `disabled` prop:**
```tsx
<input
  type={showPassword ? 'text' : 'password'}
  required
  autoComplete="off"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  disabled={loginProtection.isLocked}  {/* ADD THIS */}
  placeholder={t('password') || 'Password'}
  className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 pr-10 sm:pr-14 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base text-center sm:text-left placeholder:text-center sm:placeholder:text-left disabled:opacity-50 disabled:cursor-not-allowed"
/>
```

---

### 6. Disable Login Button When Locked (Line 601)

**Update the button's `disabled` prop:**
```tsx
<button
  type="submit"
  disabled={loginLoading || loginProtection.isLocked}  {/* ADD || loginProtection.isLocked */}
  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-1.5 sm:mt-0 text-center touch-manipulation"
>
```

---

## 🔧 Optional: Make Backend Rate Limiting Stricter

**File**: `backend/src/main.ts` (Line 39-44)

**Current setting:**
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20'), // 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Recommended stricter setting:**
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10'), // 10 attempts (stricter!)
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this IP. Please try again later.',
});
```

---

## 🎯 How It Works

### Layer 1: Frontend Protection (Immediate)
1. **First failed attempt**: Normal error message
2. **3 attempts remaining**: ⚠️ Warning shown
3. **2 attempts remaining**: ⚠️ Warning shown
4. **1 attempt remaining**: ⚠️ Final warning
5. **5th failed attempt**: 🔒 15-minute lockout activated
   - Form inputs disabled
   - Login button disabled
   - Red lockout message displayed
   - Countdown timer shows remaining time

### Layer 2: Minimum Delay (2 seconds)
- Prevents rapid-fire login attempts
- Even with correct credentials, must wait 2 seconds between attempts

### Layer 3: Backend Rate Limiting
- IP-based: 20 attempts per 15 minutes (can be reduced to 10)
- Protects against distributed attacks
- Works even if user clears localStorage

### Layer 4: Persistent State
- Lockout survives page refresh
- Stored in localStorage
- Automatically clears after lockout period expires

---

## 🧪 Testing

### Test Scenario 1: Normal Failed Attempts
1. Enter wrong password
2. Click login 3 times
3. Should see warning: "2 attempts remaining"
4. Try 2 more times
5. Should be locked for 15 minutes

### Test Scenario 2: Rapid Clicking
1. Click login button rapidly
2. Should see "Please wait 2 seconds" message
3. Only ONE request goes through at a time

### Test Scenario 3: Page Refresh
1. Get locked out
2. Refresh the page
3. Should still be locked with countdown timer

### Test Scenario 4: Successful Login
1. Get a few failed attempts
2. Enter correct credentials
3. Counter should reset to 0

---

## 📊 Security Benefits

✅ **Prevents brute force attacks**: Locks account after 5 attempts
✅ **Prevents credential stuffing**: Rate limiting stops automated tools
✅ **Prevents rapid spam**: 2-second minimum delay between attempts
✅ **User-friendly**: Clear warnings and countdown timer
✅ **Persistent**: Can't bypass by refreshing page
✅ **Auto-recovery**: Automatically unlocks after time period
✅ **Progressive warnings**: User gets warnings at 3, 2, 1 attempts
✅ **Multiple layers**: Frontend + Backend protection

---

## 🚀 Deployment

1. **Create the hook**: `frontend/src/hooks/useLoginProtection.ts` ✅ (Done)
2. **Update Login.tsx**: Follow steps 1-6 above
3. **Test locally**: Try failing login 5 times
4. **(Optional) Tighten backend**: Reduce from 20 to 10 attempts
5. **Build and deploy**: `npm run build`

---

## 🔐 Best Practices

- **Never show specific error messages**: Don't reveal if email exists
- **Log suspicious activity**: Backend should log repeated failed attempts
- **Monitor patterns**: Watch for distributed attacks from multiple IPs
- **Consider 2FA**: For high-security accounts, add two-factor authentication
- **Email notifications**: Consider sending email after 3+ failed attempts
