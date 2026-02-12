

# Diagnose: Admin/Teacher belandt op StudentDashboard

## Het exacte probleem

De screenshot toont: URL = `/admin/final-exams`, maar de inhoud is het **StudentDashboard** (met MainLayout Header, "Welkom terug, Ibra!", voortgangskaarten). Er is geen AdminSidebar zichtbaar.

Dit kan maar op een manier gebeuren:
1. AdminLayout rendert, ziet `role !== "admin"`, doet `<Navigate to="/dashboard" replace />`
2. DashboardPage rendert, en toont StudentDashboard (of een loader)

## De 3 fundamentele oorzaken

### Oorzaak 1: PWA Service Worker serveert oude JS-bundels (HOOFDOORZAAK)

De `vite-plugin-pwa` met `globPatterns: ["**/*.{js,css,html,...}"]` cached ALLE gebouwde JS-bestanden. De fixes voor AdminLayout, Header, etc. zijn correct in de broncode, maar de Service Worker in de browser van de gebruiker serveert nog steeds de **oude** gecachte versie.

De `skipWaiting: true` en `clientsClaim: true` die eerder zijn toegevoegd helpen alleen bij **nieuwe** Service Worker installaties. De reeds geinstalleerde oude SW in de browser luistert niet naar deze instellingen, want die staan in de NIEUWE SW die nog niet geladen is door de oude SW.

**Bewijs**: De gebruiker zegt "ik zag de wijzigingen kort, daarna verdwenen ze" - dit is exact het gedrag van een SW die bij eerste bezoek de nieuwe code laadt, maar daarna de gecachte oude versie serveert.

### Oorzaak 2: Auth dubbele initialisatie race condition

In `AuthContext.tsx` worden TWEE bronnen tegelijk gebruikt:
- `supabase.auth.onAuthStateChange()` (regel 116) - zet user, en deferred via `setTimeout` fetchUserData
- `supabase.auth.getSession()` (regel 139) - zet user opnieuw, awaits fetchUserData

Probleem: als `onAuthStateChange` als eerste fired en user zet, maar de setTimeout voor fetchUserData nog niet uitgevoerd is, EN tegelijk `getSession` resolved en `loading=false` zet voordat de role is opgehaald door de setTimeout callback - dan is er een moment waarop:
- `user` = ingesteld
- `role` = null (nog niet opgehaald door de uitgestelde setTimeout)
- `loading` = false

AdminLayout ziet dan: `loading=false`, `user` bestaat, `role=null` -- maar de check is `user && role === null` wat TRUE is, dus toont loader. Dat zou veilig moeten zijn.

MAAR: als er een TOKEN_REFRESHED event komt (na verloop van tijd), fired onAuthStateChange opnieuw. De `fetchUserData` wordt opnieuw gequeued via setTimeout. Als er op dat moment een netwerk-vertraging is bij het ophalen van user_roles, EN de Supabase API response gecached is door de SW met verkeerde/verouderde data, dan kan `fetchRole` falen en `role` op `null` zetten. AdminLayout doet dan een redirect naar `/dashboard`.

### Oorzaak 3: Supabase API response caching door SW

De workbox config cached ook Supabase API responses:
```
urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
handler: "NetworkFirst",
```

Bij netwerk-problemen valt `NetworkFirst` terug op de cache. Als de cache een verouderde user_roles response bevat (of geen response), kan `fetchRole` falen of verkeerde data teruggeven.

## 3 Fundamentele Oplossingen

### Oplossing 1: PWA volledig uitschakelen (AANBEVOLEN - lost het kernprobleem op)

De PWA-functionaliteit voegt geen waarde toe voor dit platform (het is een web-app voor onderwijs, geen offline-first app). De Service Worker veroorzaakt structurele problemen.

**Wijzigingen:**

**`vite.config.ts`**: Verwijder de `VitePWA` plugin volledig uit de plugins array.

**`src/main.tsx`**: Voeg een eenmalige Service Worker unregistratie toe die alle bestaande SW's bij gebruikers verwijdert:
```
// Bij app-start: verwijder alle oude Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}
```

**`index.html`**: Verwijder PWA-gerelateerde meta tags (apple-mobile-web-app-capable, manifest link).

Dit is de meest definitieve oplossing: geen SW = geen caching-problemen = code-wijzigingen zijn altijd direct zichtbaar.

### Oplossing 2: Auth initialisatie herschrijven met single source of truth

Vervang de huidige dubbele initialisatie (onAuthStateChange + getSession die allebei fetchUserData aanroepen) door een gecontroleerde flow:

**`src/contexts/AuthContext.tsx`**: 

1. Gebruik ALLEEN `getSession()` voor de initiele sessie-check
2. Gebruik `onAuthStateChange` ALLEEN voor state-updates na de initiele load (TOKEN_REFRESHED, SIGNED_OUT, etc.)
3. Voeg een `initialLoadDone` ref toe die voorkomt dat onAuthStateChange de initiele load overschrijft
4. Verwijder de `setTimeout` - gebruik direct `await fetchUserData()` overal
5. Zorg dat `loading` pas `false` wordt wanneer role definitief is geladen

Pseudo-code:
```
const initialLoadDone = useRef(false);

useEffect(() => {
  // 1. Initial load via getSession
  getSession() -> if user -> await fetchUserData -> setLoading(false)
  initialLoadDone.current = true;
  
  // 2. Subsequent changes via onAuthStateChange  
  onAuthStateChange((event, session) => {
    if (!initialLoadDone.current) return; // skip initial event
    if (event === 'SIGNED_OUT') { clear state }
    if (event === 'TOKEN_REFRESHED') { update session only, don't refetch role }
    if (event === 'SIGNED_IN') { fetchUserData }
  });
}, []);
```

### Oplossing 3: AdminLayout/TeacherLayout resilient maken (defense in depth)

Zelfs met oplossing 1 en 2 moet de layout-component nooit blind redirecten:

**`src/components/admin/AdminLayout.tsx`**:
- Voeg een `roleCheckTimeout` toe: als role na 5 seconden nog null is, toon een foutmelding met retry-knop in plaats van redirect
- Gebruik een `useRef` om te voorkomen dat een redirect gebeurt voordat de role minstens 1x succesvol is opgehaald
- Log een warning naar console als redirect getriggerd wordt, voor debugging

```
const roleChecked = useRef(false);
const [roleTimeout, setRoleTimeout] = useState(false);

useEffect(() => {
  if (role !== null) roleChecked.current = true;
  const timer = setTimeout(() => setRoleTimeout(true), 5000);
  return () => clearTimeout(timer);
}, [role]);

// Render logic:
// Als role null en niet timeout: toon loader
// Als role null en timeout: toon foutmelding + retry
// Als role !== 'admin' EN roleChecked: redirect
// Als role === 'admin': render admin UI
```

Dezelfde aanpak voor **`src/components/teacher/TeacherLayout.tsx`**.

## Implementatievolgorde

1. **Oplossing 1** eerst (PWA uitschakelen + SW unregister) - dit lost het "verdwijnen" probleem definitief op
2. **Oplossing 2** daarna (Auth single source of truth) - dit voorkomt race conditions structureel
3. **Oplossing 3** als laatste (resilient layouts) - defense in depth tegen toekomstige edge cases

## Resterende items uit het oorspronkelijke plan

Na het oplossen van het bovenstaande, blijven deze items open en worden ze meegenomen:

| Item | Status | Actie |
|------|--------|-------|
| Release settings integratie | Voltooid in code, moet zichtbaar zijn na SW fix | Verificatie na oplossing 1 |
| Student class filter | Voltooid in code, moet zichtbaar zijn na SW fix | Verificatie na oplossing 1 |
| i18n polish (nav.gamification key) | Ontbrekende key moet toegevoegd worden | Toevoegen aan nl/en/ar.json |
| E2E tests | Specs bestaan, niet handmatig getest | Updaten na fixes |

