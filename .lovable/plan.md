

# Analyse: Admin/Teacher dashboard springt terug naar leerlingen-dashboard na refresh

## Het probleem
Na een page refresh op `/admin` of `/teacher` wordt de gebruiker teruggeredirect naar `/dashboard`, waar `DashboardPage` het StudentDashboard toont voordat de rol correct is opgehaald.

---

## Oorzaak 1: `SIGNED_IN`-handler zet `loading=false` VOORDAT de rol is opgehaald

### Mechanisme
In `AuthContext.tsx` (regel 178-190), wanneer het `SIGNED_IN`-event vuurtt bij refresh:

```text
SIGNED_IN event fires
  ├── setUser(user)           ← user is gezet
  ├── setLoading(false)       ← loading is ONMIDDELLIJK false
  ├── signedInHandled = true
  └── setTimeout(() => {
        fetchUserData()       ← rol wordt PAS LATER opgehaald
      }, 0)
```

Er ontstaat een render-window waarin `loading=false`, `user` bestaat, maar `role` nog `null` is. Hoewel `ProtectedRoute` een guard heeft voor `role===null`, wordt `loading` op `false` gezet terwijl de rol-fetch nog niet gestart is. Dit kan bij React-batchingwijzigingen leiden tot een frame waarin de child-component (AdminLayout/TeacherLayout) rendert met `role=null`, waardoor de fallback `<Navigate to="/dashboard">` activeert.

### Oplossing
Zet `loading` pas op `false` nadat `fetchUserData` is voltooid, niet onmiddellijk bij `SIGNED_IN`. Verwijder het `setTimeout`-patroon en wacht synchroon op de rol:

```text
AuthContext.tsx wijzigingen:
- Regel 181: verwijder `setLoading(false)` uit SIGNED_IN handler
- Regel 185-188: vervang setTimeout door direct await + setLoading(false) erna
- Voeg een ref toe die dubbele fetchUserData-calls voorkomt

Concreet:
  if (event === 'SIGNED_IN') {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    signedInHandled.current = true;
    if (currentSession?.user) {
      // Direct fetchen, NIET deferred
      await fetchUserData(currentSession.user.id);
    }
    setLoading(false);  // PAS NA rol-fetch
  }
```

Hiervoor moet de callback async worden gemaakt. Dit voorkomt het race-window volledig.

---

## Oorzaak 2: `signedInHandled`-ref blokkeert `initializeAuth` als backup

### Mechanisme
In `AuthContext.tsx` (regel 138):
```text
initializeAuth() {
  const session = await getSession()
  if (signedInHandled.current) return  ← STOPT HIER
  // fetchUserData wordt OVERGESLAGEN
}
```

Wanneer `onAuthStateChange` het `SIGNED_IN`-event vuurtt voordat `getSession()` klaar is:
1. `SIGNED_IN` zet `signedInHandled = true` en deferred de rol-fetch via `setTimeout`
2. `getSession()` resolvet, ziet `signedInHandled = true`, en returnt ZONDER `fetchUserData` aan te roepen
3. De enige kans om de rol op te halen is nu de deferred `setTimeout`, die kan falen door timing of netwerk

Als de deferred call faalt, blijft `role` permanent `null`. Na de 15s-timeout in AdminLayout/TeacherLayout wordt de gebruiker naar `/dashboard` gestuurd.

### Oplossing
Verwijder de `signedInHandled`-ref en het bijbehorende early-return. Gebruik in plaats daarvan een `fetchingRef` die dubbele parallelle fetches voorkomt:

```text
AuthContext.tsx wijzigingen:
- Verwijder signedInHandled ref (regels 57, 138, 182)
- Voeg een isFetchingRef toe:
    const isFetching = useRef(false);
    
    const fetchUserData = async (userId: string) => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        await Promise.all([fetchProfile(userId), fetchRole(userId)]);
      } finally {
        isFetching.current = false;
      }
    };

- In initializeAuth: altijd fetchUserData aanroepen (de ref voorkomt dubbel werk)
- In SIGNED_IN: ook fetchUserData aanroepen (de ref voorkomt dubbel werk)
```

Dit zorgt ervoor dat de rol ALTIJD wordt opgehaald, ongeacht welk pad (initializeAuth of SIGNED_IN) als eerste aankomt.

---

## Oorzaak 3: `INITIAL_SESSION`-event wordt niet afgehandeld

### Mechanisme
Moderne Supabase v2 vuurtt op page refresh het event `INITIAL_SESSION` af, niet `SIGNED_IN`. De `onAuthStateChange`-handler (regels 159-192) behandelt alleen:
- `SIGNED_OUT`
- `TOKEN_REFRESHED`
- `SIGNED_IN`

`INITIAL_SESSION` valt door alle if-branches heen zonder actie. Dit betekent:
- De gehele flow hangt af van `initializeAuth()` via `getSession()`
- Maar als `getSession()` en `onAuthStateChange` in een race zitten, of als Supabase intern `INITIAL_SESSION` vuurtt EN daarna `TOKEN_REFRESHED` (die de user overschrijft zonder rol op te halen), kan de rol verloren gaan

De onzekerheid over welk event eerst vuurtt maakt de flow fragiel.

### Oplossing
Behandel `INITIAL_SESSION` expliciet in de `onAuthStateChange`-handler, en maak `initializeAuth` de secundaire fallback:

```text
AuthContext.tsx wijzigingen:
- Voeg INITIAL_SESSION handling toe in onAuthStateChange:

  if (event === 'INITIAL_SESSION') {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    if (currentSession?.user) {
      await fetchUserData(currentSession.user.id);
    }
    setLoading(false);
    initialLoadDone.current = true;
    return;
  }

- Pas initializeAuth aan als fallback:
  Als initialLoadDone.current al true is (gezet door INITIAL_SESSION),
  skip getSession en fetchUserData.
```

---

## Samenvatting van alle wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | (1) Verwijder `setLoading(false)` uit SIGNED_IN, zet het NA fetchUserData. (2) Verwijder `signedInHandled` ref, gebruik `isFetching` ref. (3) Voeg `INITIAL_SESSION` handler toe. Maak onAuthStateChange callback async. |
| `src/components/auth/ProtectedRoute.tsx` | Geen wijziging nodig (guards zijn correct) |
| `src/pages/DashboardPage.tsx` | Geen wijziging nodig (guards zijn correct) |
| `src/components/admin/AdminLayout.tsx` | Geen wijziging nodig |
| `src/components/teacher/TeacherLayout.tsx` | Geen wijziging nodig |

De kern van de fix zit volledig in `AuthContext.tsx`: de volgorde van state-updates moet garanderen dat `loading` pas `false` wordt nadat zowel `user` als `role` zijn opgehaald, ongeacht welk Supabase-event als eerste vuurtt.

