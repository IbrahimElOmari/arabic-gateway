## Diagnose

De fout ontstaat niet in de login-formulierlogica zelf. De preview crasht al vóórdat `LoginPage.tsx` kan renderen, omdat de route via `React.lazy(() => import("./pages/LoginPage"))` dynamisch wordt ingeladen. In de Lovable preview faalt die dynamische module-aanvraag voor `/src/pages/LoginPage.tsx`, waardoor de globale ErrorBoundary de melding “Er ging iets mis” toont.

Daarnaast probeert de error logger die fout naar analytics te sturen, maar die request faalt ook. Dat is secundair en niet de oorzaak van het witte foutscherm.

## Oplossing

1. **Login-route robuust maken**
   - `LoginPage` niet langer lazy-loaden, maar statisch importeren in `src/App.tsx`.
   - Daardoor is `/login` onderdeel van de hoofdmodule en hoeft de browser geen aparte dynamische `LoginPage.tsx` module op te halen.

2. **Auth-routes preventief beschermen**
   - Ook `RegisterPage`, `ForgotPasswordPage` en `ResetPasswordPage` statisch importeren, omdat dit dezelfde publieke auth-flow is en dezelfde lazy-load-fout kan krijgen.
   - De overige grote pagina’s blijven lazy-loaded, zodat performance behouden blijft.

3. **Fallback verbeteren bij toekomstige lazy-load failures**
   - Een kleine helper toevoegen voor lazy imports die bij chunk/module-load fouten één keer automatisch een harde refresh probeert.
   - Zo krijgt de gebruiker bij verouderde preview-cache of tijdelijke module-mismatch niet direct een permanent foutscherm.

4. **ErrorBoundary retry zinvoller maken**
   - De “Opnieuw proberen”-knop bij module-load fouten een volledige pagina-refresh laten doen in plaats van alleen React state resetten. Bij deze fout helpt een lokale state-reset meestal niet.

## Technische details

Te wijzigen bestanden:
- `src/App.tsx`
- `src/components/ErrorBoundary.tsx`
- eventueel nieuw: `src/lib/lazy-retry.ts`

Geen databasewijzigingen nodig. Geen wijziging aan e-mailconfiguratie of Sprint 2/3 functionaliteit.

## Verwacht resultaat

Na implementatie opent `/login` weer normaal. Als later een dynamisch ingeladen route tijdelijk niet opgehaald kan worden, krijgt de app een automatische herstelpoging en een betere retry-flow in plaats van direct vast te lopen op het foutscherm.