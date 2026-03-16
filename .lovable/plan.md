

# Plan: Alle 7 verbeterpunten naar 100%

De 7 punten die in Batch 2 zijn verbeterd maar niet 100% bereikten:

---

## 1. PaymentsPage (90% → 100%)

**Ontbrekend:**
- Ongebruikte imports: `PaymentStatus` type en `ExportButtons` component
- Geen paginering bij grote datasets (haalt alles op in 1 query)

**Aanpak:**
- Verwijder `PaymentStatus` type (lijn 17) en `ExportButtons` import (lijn 15)
- Voeg server-side paginering toe via `.range()` met 25 rijen per pagina + navigatieknoppen (identiek patroon als ForumRoomPage)

---

## 2. Certificaatgeneratie (90% → 100%)

**Ontbrekend:**
- XSS in `certificate-utils.ts`: `data.studentName`, `data.levelName`, `data.institutionName` worden ongeëscaped in HTML geïnterpoleerd
- `ProgressPage` toont een certificaat per attempt in plaats van per uniek voltooid niveau (duplicaten)

**Aanpak:**
- `escapeHtml()` toevoegen in `certificate-utils.ts` voor alle user data in de template
- In `ProgressPage`: de-dupliceren op `level_id` en alleen geslaagde attempts tonen als certificaat

---

## 3. Forum paginering (90% → 100%)

**Ontbrekend:**
- Geen commentaar-count per post in de lijstweergave (gebruiker weet niet hoeveel reacties er zijn)

**Aanpak:**
- Voeg een count-query toe voor `forum_comments` per post_id, of voeg een `comments_count` display toe naast likes

---

## 4. Admin activity logging (65% → 100%)

**Ontbrekend:** `logAdminAction` is alleen geïntegreerd in LevelsPage en KnowledgeBaseManagementPage. 6 admin pagina's missen het:

| Pagina | Mutaties die logging nodig hebben |
|--------|----------------------------------|
| ClassesPage | create, update, delete, assignTeacher, enrollStudent |
| DiscountCodesPage | create, toggleActive, delete |
| FinalExamsPage | create, update, delete |
| UsersPage | updateRole |
| TeacherApprovalsPage | processApplication (approve/reject) |
| ContentReportsPage | updateReport, deleteContent |
| PlacementsPage | schedule, complete |

**Aanpak:**
- Import `logAdminAction` + `useAuth` in elke pagina
- Voeg `logAdminAction()` toe in elke `onSuccess` callback

---

## 5. A11y gaps (80% → 100%)

**Ontbrekend:**
- Collapsed sidebar toont geen taal-/themawisselaars (footer is leeg in collapsed state)
- Sommige icon-only knoppen missen `aria-label` (report flags, emoji buttons in chat, like buttons)

**Aanpak:**
- In `AppSidebar`: toon compacte icon-only versies van `LanguageSwitcher` en `ThemeSwitcher` in collapsed state
- Voeg `aria-label` toe aan Flag/emoji/like knoppen in ForumRoomPage en ChatPage

---

## 6. Rate limiting/debounce (70% → 100%)

**Ontbrekend:**
- Chat berichten hebben geen throttle (gebruiker kan spam-snel berichten sturen)
- Forum post aanmaak heeft geen dubbel-submit bescherming (behalve `isPending`)

**Aanpak:**
- Voeg een cooldown state toe in ChatPage: na verzending 1s wachten voor volgende bericht (disable send button)
- Forum `createPostMutation.isPending` is al actief — bevestig dat dit voldoende is (het is)

---

## 7. Chat paginering (80% → 100%)

**Ontbrekend:**
- Haalt nu `.limit(100)` berichten op zonder "load more" UI
- Gebruiker kan oudere berichten niet zien

**Aanpak:**
- Voeg "Load older messages" knop toe bovenaan de berichtenlijst
- Implementeer cursor-based paginering: laad 50 berichten, bij klik op "Load more" voeg de volgende 50 toe

---

## Bestanden die worden gewijzigd

| Bestand | Wijzigingen |
|---------|-------------|
| `src/pages/admin/PaymentsPage.tsx` | Verwijder ongebruikte imports, voeg paginering toe |
| `src/lib/certificate-utils.ts` | escapeHtml op alle user data |
| `src/pages/ProgressPage.tsx` | De-dupliceer certificaten op level_id |
| `src/pages/ForumRoomPage.tsx` | Comment count per post tonen |
| `src/pages/admin/ClassesPage.tsx` | logAdminAction toevoegen |
| `src/pages/admin/DiscountCodesPage.tsx` | logAdminAction toevoegen |
| `src/pages/admin/FinalExamsPage.tsx` | logAdminAction toevoegen |
| `src/pages/admin/UsersPage.tsx` | logAdminAction toevoegen |
| `src/pages/admin/TeacherApprovalsPage.tsx` | logAdminAction toevoegen |
| `src/pages/admin/ContentReportsPage.tsx` | logAdminAction toevoegen |
| `src/pages/admin/PlacementsPage.tsx` | logAdminAction toevoegen |
| `src/components/layout/AppSidebar.tsx` | Collapsed footer taal/thema icons |
| `src/pages/ChatPage.tsx` | Load more paginering + send cooldown |

