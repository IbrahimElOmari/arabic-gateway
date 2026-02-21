# Fix: Dashboard Redirect + Login Hang -- Root Cause Analysis

## Three Root Causes Found

### Root Cause 1: HomePage never redirects authenticated users (CRITICAL)

The screenshot shows an admin user on `/` (the HomePage). Route `/` renders `<HomePage />` unconditionally -- it has no auth check. When:

- The Lovable preview loads (default route is `/`)
- A user refreshes the page
- A user clicks the "HVA" logo (links to `/`)

...they land on the public homepage regardless of being logged in as admin/teacher. The "Dashboard" button requires a manual click.

**Fix**: Add a redirect at the top of `HomePage`: if user is authenticated and loading is done, redirect to `/dashboard` (which then redirects to `/admin` or `/teacher` based on role).

### Root Cause 2: SIGNED_IN handler defers `setLoading(false)` (LOGIN HANG)

In `AuthContext.tsx`, the SIGNED_IN handler does:

```
setUser(...)           // synchronous
setTimeout(async () => {
  await fetchUserData(...)
  setLoading(false)    // <-- DEFERRED until role is fetched
}, 0)
```

Problem: If `initializeAuth` hasn't completed yet (loading is still `true`), the SIGNED_IN handler never sets `loading = false` synchronously. LoginForm checks `user && !loading` -- with loading still `true`, it can't navigate. The user is stuck on the login page until the setTimeout completes fetchUserData.

Worse: if `initializeAuth`'s `getSession()` is slow and completes AFTER the SIGNED_IN handler, it may overwrite `user` with a stale result.

**Fix**: In the SIGNED_IN handler, set `loading = false` synchronously (right after setting user/session). Fetch role in background -- the `ProtectedRoute` and `DashboardPage` guards already handle `role === null` with spinners.

### Root Cause 3: No protection against initializeAuth overwriting SIGNED_IN state

Both `initializeAuth` and the SIGNED_IN listener can set user/session. If the SIGNED_IN event fires while `getSession()` is still pending, `initializeAuth` could later overwrite the user with stale data.

**Fix**: Use a ref to track if SIGNED_IN already set the user. In `initializeAuth`, skip overwriting if SIGNED_IN already fired.

---

## Changes (3 files)

### 1. `src/pages/HomePage.tsx`

Add at the top of the component:

```typescript
const { user, loading } = useAuth();

if (!loading && user) {
  return <Navigate to="/dashboard" replace />;
}
```

Import `Navigate` from `react-router-dom`.

### 2. `src/contexts/AuthContext.tsx`

**SIGNED_IN handler** -- set `loading = false` synchronously, fetch role in background:

```typescript
if (event === 'SIGNED_IN') {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);
  setLoading(false);  // Immediate -- LoginForm can navigate now
  signedInHandled.current = true;  // Mark that SIGNED_IN was handled
  if (currentSession?.user) {
    setTimeout(async () => {
      if (!mounted) return;
      await fetchUserData(currentSession.user.id);
    }, 0);
  }
}
```

**initializeAuth** -- don't overwrite if SIGNED_IN already handled:

```typescript
const initializeAuth = async () => {
  try {
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (!mounted) return;
    // Don't overwrite if SIGNED_IN already set the user
    if (signedInHandled.current) return;

    setSession(existingSession);
    setUser(existingSession?.user ?? null);
    if (existingSession?.user) {
      await fetchUserData(existingSession.user.id);
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
  } finally {
    if (mounted) {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }
};
```

Add ref: `const signedInHandled = useRef(false);`

### 3. `src/components/auth/LoginForm.tsx`

No changes needed -- the existing `useEffect` with `user && !loading` will work correctly once `loading` is set to `false` synchronously in the SIGNED_IN handler.

---

## How This Fixes Both Bugs

**Login hang**: SIGNED_IN sets `loading = false` immediately. LoginForm sees `user && !loading` on next render and navigates to `/dashboard`. No more waiting for fetchUserData.

**Admin/Teacher seeing wrong dashboard**: 

1. After login: navigates to `/dashboard`, DashboardPage Guard 2 shows spinner while role loads, then redirects to `/admin` or `/teacher`.
2. Direct visit to `/`: HomePage now redirects to `/dashboard`, same flow as above.

**Race condition**: `signedInHandled` ref prevents `initializeAuth` from overwriting user state set by SIGNED_IN.

## Verification

After implementation, the following should be testable:

- Login as admin -> immediately navigates to `/admin` (via `/dashboard`)
- Login as teacher -> immediately navigates to `/teacher` (via `/dashboard`)  
- Login as student -> immediately shows student dashboard
- Visit `/` while logged in -> redirected to appropriate dashboard
- Page refresh while logged in -> correct dashboard shown
- No infinite spinners or redirect loops
- Lever al je bewijzen en test en werk in een uitgebreid rapport 