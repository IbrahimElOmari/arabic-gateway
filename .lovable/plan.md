
# Definitieve Analyse: Admin/Teacher Ziet StudentDashboard

## Grondige Analyse: De 3 Fundamentele Oorzaken

### Oorzaak 1: Oude Service Worker Serveert Gecachte index.html (HOOFDOORZAAK)

De PWA plugin (`vite-plugin-pwa`) is correct verwijderd uit `vite.config.ts` en `package.json`. Er staat ook SW-unregister code in `src/main.tsx`. MAAR: die unregister code zit in gebundeld JavaScript. Het probleem is een kip-en-ei situatie:

```text
Stap 1: Browser laadt pagina
Stap 2: Oude Service Worker onderschept het verzoek
Stap 3: Oude SW serveert GECACHTE index.html (de OUDE versie)
Stap 4: Oude index.html verwijst naar OUDE JS-bestanden (met oude hashes)
Stap 5: Oude SW serveert die OUDE JS-bestanden uit cache
Stap 6: OUDE main.tsx wordt uitgevoerd (zonder unregister code!)
Stap 7: Gebruiker ziet de OUDE UI (zonder admin-links, zonder rol-badge)
```

De unregister code in de NIEUWE main.tsx wordt **nooit bereikt** omdat de oude SW de oude versie van alles serveert.

**Bewijs**: Er is geen `public/sw.js` bestand aanwezig. De oude SW kan daarom niet worden vervangen door een zelfvernietigende versie. De browser zoekt periodiek (elke 24 uur) naar updates van het SW-bestand, maar krijgt een 404. Niet alle browsers behandelen een 404 als signaal om de SW te deactiveren.

### Oorzaak 2: Geen Navigatie na Succesvolle Login

In `src/components/auth/LoginForm.tsx` (regel 49-53):
```typescript
const onSubmit = async (data: LoginFormValues) => {
  setIsLoading(true);
  await signIn(data.email, data.password);
  setIsLoading(false);
  // GEEN navigate() hier!
};
```

Na succesvol inloggen:
- De gebruiker BLIJFT op de loginpagina
- Ze moeten HANDMATIG navigeren naar /dashboard of /admin
- Als ze naar /dashboard gaan, moet de useEffect in DashboardPage de redirect afhandelen
- Tussen het moment van inloggen en het moment dat `fetchUserData` compleet is (via onAuthStateChange SIGNED_IN handler), is er een window waar `role === null`
- Als de gebruiker PRECIES in dit window navigeert, zien ze een loader, dan (correct) de redirect

Dit is geen directe oorzaak van het StudentDashboard-probleem, maar het vergroot de verwarring en maakt de flow fragiel.

### Oorzaak 3: Token-verloop Kan Role Ophalen Breken

Wanneer de Supabase sessie-token verloopt en de browser de pagina herlaadt:

1. `getSession()` retourneert de sessie uit localStorage (inclusief verlopen access_token)
2. `fetchRole` maakt een query naar `user_roles` met het verlopen token
3. De RLS policy `auth.uid() = user_id` geeft `null` terug voor `auth.uid()` bij een verlopen token
4. De query retourneert 0 rijen -> `maybeSingle()` geeft `data = null`
5. `role` wordt `null`
6. AdminLayout toont een loader (5 seconden), dan retry-knop

Dit verklaart waarom het probleem SOMS optreedt (na "een tijdje") maar niet altijd. Supabase's auto-refresh mechanisme lost dit meestal op, maar er is een race window.

## De 3 Fundamentele Oplossingen

### Oplossing 1: Zelfvernietigende Service Worker (lost het caching-probleem definitief op)

Maak een `public/sw.js` bestand aan dat zichzelf onmiddellijk vernietigt:

```javascript
// Self-destructing service worker
// When the browser checks for SW updates, it finds this file,
// installs it, and this SW immediately unregisters itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.map(name => caches.delete(name)))
    ).then(() => self.registration.unregister())
    .then(() => self.clients.matchAll())
    .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});
```

Hoe dit werkt:
- De browser controleert periodiek (elke 24u of bij navigatie) of het SW-bestand is gewijzigd
- De browser vindt dit NIEUWE sw.js (in plaats van 404)
- De nieuwe SW installeert zich met `skipWaiting` (neemt onmiddellijk over)
- Bij activatie: wist ALLE caches en unregistert zichzelf
- Herlaadt alle open tabs met frisse code

Daarnaast: voeg inline SW-cleanup code toe aan `index.html` als extra vangnet (voor het geval de nieuwe HTML WEL geladen wordt):

```html
<script>
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(r=>r.forEach(reg=>reg.unregister()));
  if('caches' in window) caches.keys()
    .then(n=>n.forEach(name=>caches.delete(name)));
}
</script>
```

### Oplossing 2: Post-login Navigatie Toevoegen

Wijzig `LoginForm.tsx` om na succesvolle login automatisch te navigeren:

```typescript
const onSubmit = async (data: LoginFormValues) => {
  setIsLoading(true);
  const { error } = await signIn(data.email, data.password);
  setIsLoading(false);
  if (!error) {
    navigate('/dashboard');
  }
};
```

DashboardPage handelt de rest af:
- admin -> redirect naar /admin
- teacher -> redirect naar /teacher
- student -> toon StudentDashboard

Dit elimineert de manuele navigatie-stap en voorkomt dat gebruikers in een tussentijdse state terechtkomen.

### Oplossing 3: AuthContext Token-Refresh Resilientie

Verbeter `fetchRole` in AuthContext om token-refresh problemen op te vangen:

1. Voeg een retry-mechanisme toe aan `fetchRole`: als de eerste poging faalt, wacht 1 seconde (laat Supabase het token refreshen), probeer opnieuw
2. Bewaar de laatst bekende role in een ref, zodat bij een tijdelijke fetch-fout de vorige role behouden blijft (in plaats van null te zetten)

```typescript
const lastKnownRole = useRef<AppRole | null>(null);

const fetchRole = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const fetchedRole = (data?.role as AppRole) || null;
    if (fetchedRole) lastKnownRole.current = fetchedRole;
    setRole(fetchedRole);
    return fetchedRole;
  } catch (error) {
    console.error('Error fetching role:', error);
    // Retry once after delay (token might be refreshing)
    await new Promise(r => setTimeout(r, 1000));
    try {
      const { data } = await supabase
        .from('user_roles').select('role')
        .eq('user_id', userId).maybeSingle();
      const retryRole = (data?.role as AppRole) || lastKnownRole.current;
      setRole(retryRole);
      return retryRole;
    } catch {
      // Use last known role as fallback
      setRole(lastKnownRole.current);
      return lastKnownRole.current;
    }
  }
};
```

## Implementatieoverzicht

| Bestand | Wijziging |
|---------|-----------|
| `public/sw.js` | NIEUW - zelfvernietigende Service Worker |
| `index.html` | Inline SW cleanup script toevoegen voor de bundled JS |
| `src/components/auth/LoginForm.tsx` | Navigate naar /dashboard na succesvolle login |
| `src/contexts/AuthContext.tsx` | Retry-mechanisme + lastKnownRole fallback in fetchRole |
| `src/main.tsx` | Bestaande SW cleanup code behouden (extra vangnet) |

## Waarom Dit 100% Definitief Is

1. **Zelfvernietigende SW**: Ongeacht welke oude SW actief is, de browser zal ALTIJD het nieuwe sw.js bestand ophalen bij de volgende update-check. Dit bestand vernietigt de oude SW en wist alle caches. Er is geen ontsnapping mogelijk.

2. **Inline cleanup in HTML**: Voor gebruikers die WEL de nieuwe HTML laden (bijv. na hard refresh, incognito), wordt de SW onmiddellijk verwijderd voordat enige gebundelde JS laadt.

3. **Post-login navigatie**: Elimineert het handmatige navigatie-window waar timing-problemen kunnen optreden.

4. **Role retry + fallback**: Zelfs bij netwerk/token-problemen wordt de role niet onnodig op null gezet, wat voorkomt dat AdminLayout redirect naar /dashboard.

## Test & Bewijs Plan

Na implementatie test ik met de browser-tool:
1. Navigeren naar /login
2. Inloggen als admin
3. Verifieren dat automatische redirect naar /admin plaatsvindt
4. Verifieren dat admin sidebar en content zichtbaar zijn
5. Pagina refreshen - verifieren dat admin UI behouden blijft
6. Screenshots nemen van elk stap als bewijs
