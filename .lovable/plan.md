

# Diagnose: 3 fundamentele problemen die het laden blokkeren

## Probleem 1 (ROOT CAUSE): CSP meta tag blokkeert preview-infrastructuur

**Bestand:** `index.html`, regel 11

De `Content-Security-Policy` meta tag is extreem restrictief:
```
script-src 'self' 'unsafe-inline'
connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

Dit blokkeert in de Lovable preview (iframe op `lovable.app`):
- **`cdn.gpteng.co/lovable.js`** — het Lovable preview-script wordt geblokkeerd door `script-src 'self'`
- **HMR WebSocket** — de Vite dev server WebSocket wordt geblokkeerd door `connect-src` (geen `wss://*.lovable.app` of `wss://*.lovableproject.com`)
- **Dynamic imports** — `React.lazy()` chunk-fetches kunnen falen als de origin in de iframe niet overeenkomt

**Oplossing:** Verwijder de CSP meta tag volledig. CSP hoort via HTTP-headers op de productieserver geconfigureerd te worden (best practice). Meta-tag CSP is beperkt, niet geschikt voor dev/preview, en kan niet alle directieven bevatten. Dit is de #1 oorzaak.

---

## Probleem 2: AuthContext loading-state kan oneindig hangen

**Bestand:** `src/contexts/AuthContext.tsx`

Als `supabase.auth.getSession()` of `fetchUserData()` niet resolvet (netwerk-time-out, CSP-blokkade), dan blijft `loading = true` voor altijd. Alle `ProtectedRoute`-pagina's tonen dan een oneindige spinner.

Er is geen time-out of fallback. De 100ms delay in `initializeAuth` maakt het erger: als `INITIAL_SESSION` eerst vuurt, is het OK; maar als beide paden falen, is er geen vangnet.

**Oplossing:** Voeg een absolute time-out toe (5 seconden). Als auth na 5 seconden niet geladen is, forceer `loading = false`. Dit voorkomt dat de app voor altijd op een spinner blijft hangen.

---

## Probleem 3: Suspense zonder time-out bij falende lazy imports

**Bestand:** `src/App.tsx`

Alle 40+ pagina's worden geladen via `React.lazy()`. Als een `import()` promise nooit settlet (door CSP-blokkade of netwerkprobleem), toont `<Suspense fallback={<FullPageLoader />}>` de spinner **voor altijd**. Er is geen time-out of foutmelding voor de gebruiker.

**Oplossing:** Voeg een time-out-wrapper toe aan de Suspense fallback: als het laden langer dan 10 seconden duurt, toon een foutmelding met een "herlaad"-knop in plaats van een oneindige spinner.

---

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `index.html` | CSP meta tag verwijderen (regel 11) |
| `src/contexts/AuthContext.tsx` | 5s time-out toevoegen aan auth loading |
| `src/components/FullPageLoader.tsx` | Time-out met foutmelding + herlaadknop toevoegen |

De CSP-verwijdering lost het directe probleem op. De time-outs voorkomen dat soortgelijke problemen in de toekomst de app onbruikbaar maken.

