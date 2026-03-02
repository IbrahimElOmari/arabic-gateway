

# Plan: Fix reload-loop in main.tsx

## Probleem

In `src/main.tsx` wordt `__BUILD_TIMESTAMP__` bij elke build/HMR-update door Vite vervangen door een nieuwe waarde. Dit triggert elke keer:
1. `storedVersion !== BUILD_VERSION` → true
2. `storedVersion !== null` → true (want vorige build had al een waarde opgeslagen)
3. `cleanup().finally(() => window.location.href = ...)` → **volledige pagina-reload**

In de Lovable preview veroorzaakt dit een zichtbare reload-loop/spinner bij elke codewijziging.

## Oplossing

Vereenvoudig `main.tsx`: skip de versiecheck in development-modus (`import.meta.env.DEV`). In productie blijft de logica behouden.

**Bestand:** `src/main.tsx`

Wijzigingen:
- Wrap de hele versiecheck in `if (!import.meta.env.DEV)` zodat development builds direct renderen
- In productie werkt de cache-busting reload nog steeds zoals bedoeld
- Verwijder de onnodige async cleanup die de render vertraagt bij first visit

Dit is een eenregelige guard die het hele probleem oplost zonder productie-functionaliteit te verliezen.

