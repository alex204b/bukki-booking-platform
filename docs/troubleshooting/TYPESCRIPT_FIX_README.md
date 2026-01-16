# TypeScript Environment Variables Fix

## Problem

When using `import.meta.env.VITE_API_URL` in the SocketContext, you may encounter this TypeScript error:

```
ERROR in src/contexts/SocketContext.tsx:51:41
TS2339: Property 'env' does not exist on type 'ImportMeta'.
```

## Solution

This error occurs because TypeScript doesn't know about Vite's environment variable types. Here's how to fix it:

### Step 1: Create Type Definitions File

Create `frontend/src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Step 2: Create Environment Variables File

Create `frontend/.env`:

```env
# Vite Frontend Environment Variables
# Backend API URL
VITE_API_URL=http://localhost:3000
```

### Step 3: Verify TypeScript Configuration

Ensure `frontend/tsconfig.json` includes the src directory:

```json
{
  "compilerOptions": {
    // ... other options
  },
  "include": [
    "src"  // This should include vite-env.d.ts
  ]
}
```

### Step 4: Restart Development Server

```bash
cd frontend
# Stop the current dev server (Ctrl+C)
npm run dev
```

## Files Created/Modified

✅ **Created:**
- `frontend/src/vite-env.d.ts` - TypeScript environment definitions
- `frontend/.env` - Vite environment variables

✅ **No changes needed:**
- `frontend/tsconfig.json` - Already configured correctly
- `frontend/src/contexts/SocketContext.tsx` - Already using import.meta.env correctly

## Verification

After applying the fix, the TypeScript error should disappear and your code should compile successfully.

### Test the Fix

1. Save all files
2. Restart the development server
3. Check that there are no TypeScript errors
4. Verify that the WebSocket connects to the correct URL

### Check Environment Variable is Loaded

In browser console:
```javascript
// This should log the API URL
console.log(import.meta.env.VITE_API_URL);
// Expected: "http://localhost:3000"
```

## Why This Happens

Vite uses `import.meta.env` to access environment variables, but TypeScript needs explicit type definitions to understand what properties exist on `import.meta.env`. The `vite-env.d.ts` file provides these type definitions.

## Adding More Environment Variables

To add more environment variables in the future:

1. Add to `frontend/.env`:
   ```env
   VITE_NEW_VARIABLE=value
   ```

2. Add to `frontend/src/vite-env.d.ts`:
   ```typescript
   interface ImportMetaEnv {
     readonly VITE_API_URL: string;
     readonly VITE_NEW_VARIABLE: string;  // Add this line
   }
   ```

**Important:** All Vite environment variables must start with `VITE_` to be exposed to your application.

## Common Issues

### Issue: Environment variable is undefined
**Solution:** Make sure the variable name starts with `VITE_` and restart dev server

### Issue: TypeScript still shows error after creating vite-env.d.ts
**Solution:**
1. Restart TypeScript server in VSCode: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Restart development server
3. Close and reopen VSCode

### Issue: Wrong URL is being used
**Solution:** Check `frontend/.env` file and verify `VITE_API_URL` is set correctly

## References

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [TypeScript Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
