
# Fix: Login Hang + Dashboard Redirect Bug

## Root Cause Analysis

The bug lives in `AuthContext.signIn()` on line 239: `setLoading(true)`.

Here is what happens step by step:

1. User clicks "Login" on `/login`
2. `signIn()` calls `setLoading(true)` (global auth loading state)
3. `signInWithPassword()` succeeds and fires `onAuthStateChange(SIGNED_IN)` internally
4. The SIGNED_IN handler checks `initialLoadDone.current` -- if the initial `getSession()` hasn't completed yet, **the SIGNED_IN event is silently SKIPPED** (line 161)
5. `initializeAuth()` finishes: `getSession()` returns `null` (it was called BEFORE the login), sets `user = null`, `loading = false`
6. Result: user is authenticated in Supabase but React state shows `user = null, loading = false`
7. LoginForm: `loginPending && !loading && user` -- user is null, so no navigation
8. 10s timeout fires, navigates to `/dashboard`
9. ProtectedRoute sees `user = null` -- redirects to `/login`
10. **Infinite loop or stuck on homepage**

Even when the timing works (SIGNED_IN is processed), setting `loading = true` in `signIn()` creates a fragile dependency on the exact ordering of async events.

## Fix: 3 Files

### 1. `src/contexts/AuthContext.tsx` -- Remove `setLoading(true)` from signIn

The `signIn` function should NOT manipulate the global `loading` state. The `onAuthStateChange` SIGNED_IN handler already manages `loading` correctly. The LoginForm has its own `isLoading` state for the button spinner.

Also: stop skipping SIGNED_IN events during initial load. Instead, allow both `initializeAuth` and `onAuthStateChange` to set user data (last write wins, both set the same data for the same user).

```text
Changes in signIn():
  - Remove line 239: setLoading(true)
  - Remove line 246: setLoading(false) (in error handler)
  - Remove line 256: setLoading(false) (in catch)

Changes in onAuthStateChange:
  - Remove line 161: if (!initialLoadDone.current) return;
  - Instead, use setTimeout(fn, 0) for SIGNED_IN to defer Supabase calls
    (prevents deadlock when onAuthStateChange fires during signInWithPassword)
```

### 2. `src/components/auth/LoginForm.tsx` -- Simplify navigation

Replace the complex loginPending + loading + role logic with a single effect:

```text
// Single effect: if user is authenticated, go to dashboard
useEffect(() => {
  if (user && !loading) {
    navigate('/dashboard');
  }
}, [user, loading, navigate]);
```

This handles:
- Fresh login: user becomes non-null after SIGNED_IN handler completes
- Already logged in user visiting /login: immediate redirect
- No need for loginPending state or 10s timeout fallback

Remove: loginPending state, both useEffects (lines 52-68), timeout logic.
Simplify onSubmit: just call signIn, no loginPending flag needed.

### 3. `src/pages/LoginPage.tsx` -- No changes needed

LoginForm handles the redirect internally.

## Technical Details

| File | Line(s) | Change |
|------|---------|--------|
| `src/contexts/AuthContext.tsx` | 239, 246, 256 | Remove `setLoading(true/false)` from `signIn()` |
| `src/contexts/AuthContext.tsx` | 156-186 | Remove `initialLoadDone` skip; use `setTimeout` for SIGNED_IN handler to defer Supabase calls |
| `src/components/auth/LoginForm.tsx` | 37, 41, 51-78 | Remove `loginPending`, replace with single `user && !loading` redirect effect |

## Why This Fixes Both Bugs

**Login hang**: No more `setLoading(true)` blocking navigation. No more skipped SIGNED_IN events. User state is always set correctly.

**Teacher/Admin seeing wrong dashboard**: Once login navigates to `/dashboard`, DashboardPage's guards (already correct) redirect teacher to `/teacher` and admin to `/admin`. The ProtectedRoute's `role === null` spinner guard (already in place) prevents premature rendering.
