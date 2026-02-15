

# Definitieve Fix: Admin/Teacher Ziet StudentDashboard

## Analyse: De 3 Fundamentele Oorzaken

### Oorzaak 1: Oude Service Worker Cache - Het Kip-en-Ei Probleem (BEWEZEN)

De code-fixes zijn correct. De database-rollen zijn correct (admin=admin, teacher=teacher). Maar de gebruiker ziet nog steeds de oude UI.

Het probleem: de zelfvernietigende `public/sw.js` en de inline cleanup in `index.html` werken ALLEEN als de browser:
- Een SW update check uitvoert (elke 24u of bij navigatie), OF
- De NIEUWE `index.html` laadt (maar de oude SW serveert de GECACHTE oude `index.html`)

Als de browser nog geen update check heeft gedaan, blijft de oude SW de oude code serveren. De nieuwe cleanup-code wordt nooit bereikt.

Bewijs: de inline cleanup in `index.html` staat op regel 31-38, maar de oude gecachte `index.html` heeft dit script niet. De oude SW serveert de oude HTML.

### Oorzaak 2: Login Navigeert Voordat Role Geladen Is

Na succesvolle login:
1. `signIn()` resolves (no error)
2. `onAuthStateChange` SIGNED_IN handler: `setUser()` + start `fetchUserData()` (async)
3. LoginForm doet onmiddellijk `navigate('/dashboard')` 
4. `loading` is `false` (nooit teruggezet naar `true` tijdens login)
5. DashboardPage rendert met user=set, role=null

De huidige code vangt dit op met `(user && role === null)` check die een loader toont. Maar `loading` wordt NOOIT teruggezet naar `true` na de initiele load. Dit betekent dat ProtectedRoute de navigatie doorlaat terwijl de role nog null is, waardoor er een afhankelijkheid is van de correcte werking van de `(user && role === null)` check in DashboardPage.

### Oorzaak 3: Geen Versiebeheer - Geen Manier om Cache te Forceren

Er is geen app-versiemechanisme. De gebruiker weet niet dat er een nieuwe versie is. Er is geen manier om de browser te dwingen de cache te verlaten en nieuwe code te laden.

---

## De 3 Oplossingen

### Oplossing 1: App Versie Check met Force Reload

Voeg een BUILD_VERSION toe aan de app. Bij elke nieuwe build wordt dit automatisch bijgewerkt. Bij app-start vergelijkt de code de huidige versie met een opgeslagen versie in localStorage. Bij mismatch: force hard reload + clear alle caches.

Bestanden:
- `src/main.tsx`: Voeg versie-check toe VOOR React mount
- Gebruik `Date.now()` als build timestamp (uniek per build)

```text
Logica:
1. const BUILD_VERSION = "__BUILD_TIMESTAMP__" (vervangen door Vite define)
2. const storedVersion = localStorage.getItem('app_version')
3. Als storedVersion !== BUILD_VERSION:
   a. localStorage.setItem('app_version', BUILD_VERSION)
   b. Unregister alle SW's
   c. Clear alle caches
   d. window.location.reload() (force fresh load)
4. Anders: render app normaal
```

Vite config wijziging:
```text
define: {
  '__BUILD_TIMESTAMP__': JSON.stringify(Date.now().toString())
}
```

Dit lost het cache-probleem 100% op voor ALLE gebruikers bij de eerstvolgende page load.

### Oplossing 2: Login Wacht op Role Voordat Navigatie Plaatsvindt

Probleem: LoginForm navigeert onmiddellijk na `signIn()`. De role is op dat moment nog niet geladen.

Oplossing: Laat LoginForm wachten tot de role beschikbaar is via een useEffect, in plaats van direct na signIn te navigeren.

Bestanden:
- `src/components/auth/LoginForm.tsx`
- `src/contexts/AuthContext.tsx` (signIn moet loading=true zetten)

```text
// AuthContext.tsx - signIn functie:
const signIn = async (...) => {
  setLoading(true);  // <-- NIEUW: voorkomt dat ProtectedRoute doorlaat
  const { error } = await supabase.auth.signInWithPassword(...)
  if (error) {
    setLoading(false);  // Reset bij fout
    return { error };
  }
  // loading wordt false gezet wanneer fetchUserData compleet is 
  // (via SIGNED_IN handler)
  return { error: null };
};

// LoginForm.tsx - wacht op role via useEffect:
const [loginPending, setLoginPending] = useState(false);
const { user, role, loading, signIn } = useAuth();

useEffect(() => {
  if (loginPending && !loading && user && role) {
    // Role is geladen, navigeer naar dashboard
    navigate('/dashboard');
    setLoginPending(false);
  }
}, [loginPending, loading, user, role, navigate]);

const onSubmit = async (data) => {
  setIsLoading(true);
  const { error } = await signIn(data.email, data.password);
  setIsLoading(false);
  if (!error) {
    setLoginPending(true); // Wacht op role via useEffect
  }
};
```

En in de SIGNED_IN handler van AuthContext:
```text
if (event === 'SIGNED_IN') {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);
  if (currentSession?.user) {
    await fetchUserData(currentSession.user.id);
  }
  setLoading(false); // <-- NIEUW: pas NA fetchUserData
}
```

### Oplossing 3: DashboardPage Dubbele Guard + Debug Logging

Voeg extra beveiliging toe aan DashboardPage:
1. Log de huidige state bij elke render (voor debugging)
2. Voeg een expliciete guard toe die voorkomt dat StudentDashboard rendert als role niet 'student' is
3. Zorg dat de redirect useEffect ook voor null-role niet oneindig wacht

Bestand: `src/pages/DashboardPage.tsx`

```text
// Render guards:
console.log('[DashboardPage] render:', { loading, user: !!user, role, isAdmin, isTeacher });

// Guard 1: nog aan het laden
if (loading) return <Loader />;

// Guard 2: role nog niet geladen maar user wel
if (user && role === null) return <Loader />;

// Guard 3: geen user
if (!user) return <Navigate to="/login" />;

// Guard 4: admin/teacher - redirect (ook in render, niet alleen in useEffect)
if (role === 'admin') return <Navigate to="/admin" replace />;
if (role === 'teacher') return <Navigate to="/teacher" replace />;

// Guard 5: alleen studenten zien StudentDashboard
if (role === 'student') return <StudentDashboard />;

// Fallback: onbekende rol
return <Loader />;
```

De key verandering: in plaats van alleen useEffect voor redirects, gebruik ook `<Navigate>` componenten in de render. Dit is SYNCHRONE routing en voorkomt timing-issues met useEffect.

---

## Implementatieoverzicht

| # | Bestand | Wijziging | Lost op |
|---|---------|-----------|---------|
| 1 | `vite.config.ts` | `define: { '__BUILD_TIMESTAMP__': ... }` | Cache versioning |
| 2 | `src/main.tsx` | Versie-check + force reload bij mismatch | Oude SW cache |
| 3 | `src/contexts/AuthContext.tsx` | `setLoading(true)` in signIn + `setLoading(false)` in SIGNED_IN handler | Race condition |
| 4 | `src/components/auth/LoginForm.tsx` | Wacht op role via useEffect | Login timing |
| 5 | `src/pages/DashboardPage.tsx` | Navigate componenten i.p.v. useEffect | Synchrone routing |

## Testplan

Na implementatie:
1. Navigeer naar /login in de browser tool
2. Log in als admin
3. Verifieer dat de app wacht op role loading
4. Verifieer dat redirect naar /admin plaatsvindt
5. Verifieer dat AdminSidebar + admin content zichtbaar is
6. Neem screenshots als bewijs bij elke stap

