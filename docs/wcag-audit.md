# WCAG 2.1 AA audit

Laatst bijgewerkt: 2026-06-10. Scope: alle publieke en authenticated routes (NL/EN/AR).

## Automatisering

- **axe-core via Playwright** — `e2e/accessibility.spec.ts`, draait per route × per taal.
- **RTL audit** — `e2e/rtl-*.spec.ts` (landmarks, keyboard, runtime switch, visual).
- **Color contrast** — `src/test/color-contrast.test.ts` over alle semantische tokens.
- **CI**: `a11y-rtl-audit` job blokkeert PR's bij axe-violations of dir/lang-fouten.

## Status per richtlijn

| WCAG | Criterion | Status | Bewijs |
|------|-----------|--------|--------|
| 1.1.1 | Non-text content (alt-text) | ✅ | Alle `<img>` hebben `alt`; logo en avatars via `<Avatar>` met fallback |
| 1.3.1 | Info & relationships | ✅ | Semantische HTML; landmarks `<header>/<main>/<nav>/<footer>` |
| 1.3.2 | Meaningful sequence | ✅ | DOM-volgorde = visuele volgorde, RTL via logical properties |
| 1.4.3 | Contrast (minimum) 4.5:1 | ✅ | `color-contrast.test.ts` dekt alle semantic tokens |
| 1.4.4 | Resize text 200% | ✅ | `fontSize` schaal in `SettingsPage` (normal/large/extra-large) |
| 1.4.10 | Reflow 320 CSS-px | ✅ | Mobile breakpoint in `tailwind.config.ts`; geen horizontale scroll |
| 1.4.11 | Non-text contrast 3:1 | ✅ | Border-/focus-tokens > 3:1 |
| 2.1.1 | Keyboard | ✅ | Alle interactieve elementen via shadcn (Radix primitives) |
| 2.1.2 | No keyboard trap | ✅ | Dialogs gebruiken Radix focus-trap met escape |
| 2.4.1 | Bypass blocks | ✅ | "Skip to main content" link in `AppLayout` |
| 2.4.3 | Focus order | ✅ | Logische tab-volgorde; geen `tabindex > 0` |
| 2.4.6 | Headings & labels | ✅ | Eén `<h1>` per pagina, `<label>` op elke `<input>` |
| 2.4.7 | Focus visible | ✅ | `:focus-visible` ring via design tokens |
| 2.5.3 | Label in name | ✅ | `aria-label` matcht visuele tekst |
| 3.1.1 | Language of page | ✅ | `<html lang>` zet via `i18n/index.ts` + runtime-switch test |
| 3.1.2 | Language of parts | ✅ | Arabische blokken in NL-pagina krijgen `lang="ar"` |
| 3.2.1 | On focus | ✅ | Geen context-changes op focus alleen |
| 3.2.2 | On input | ✅ | Form-submit altijd expliciet |
| 3.3.1 | Error identification | ✅ | Form-errors via `<FormMessage>` met `aria-describedby` |
| 3.3.2 | Labels or instructions | ✅ | Alle inputs gelabeld; placeholders zijn aanvullend |
| 3.3.3 | Error suggestion | ✅ | Zod-messages via i18n, beschrijven verwachte waarde |
| 4.1.2 | Name, role, value | ✅ | Radix primitives leveren correcte ARIA |
| 4.1.3 | Status messages | ✅ | Toasts gebruiken `role="status"`/`role="alert"` |

## Handmatige verificatie

- **NVDA + Firefox**: signup, login, exercise-flow, payment-flow — geen issues 2026-06-10.
- **VoiceOver + Safari**: dashboard, chat, calendar — alle landmarks correct aangekondigd.
- **Keyboard-only**: volledige content-studio bewerkbaar zonder muis.
- **iOS Safari + zoom 200%**: geen horizontale scroll, alle CTA's blijven bereikbaar.

## Bekende beperkingen

- Live-lessen widget (Google Meet iframe) erven Google's contrast — buiten onze controle. Documenteer voor gebruikers.
- PDF-exports uit `export-utils` hebben geen getagde structuur (WCAG 1.3.1 voor PDF) — open punt voor P6.

## Onderhoud

Bij elke nieuwe pagina:
1. Voeg de route toe aan `e2e/accessibility.spec.ts` en `e2e/rtl-runtime-switch.spec.ts`.
2. Run `npm run a11y` lokaal vóór PR.
3. Werk deze tabel bij als nieuwe criteria-status verandert.
