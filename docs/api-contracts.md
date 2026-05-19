# Edge Function API Contracts

Alle edge functions vereisen `Authorization: Bearer <jwt>` tenzij anders vermeld.
Response is JSON. Error-payload: `{ "error": string, "code"?: string }`.

## send-email
- **Method:** POST
- **Roles:** admin, teacher (of service-role)
- **Body:** `{ to: string|string[], subject: string, html: string, from?: string }`
- **Response:** `{ data: { id: string } }`

## analytics
- **Method:** POST
- **Body:** `{ action: 'track_event', eventType: string, eventName: string, pagePath?: string, properties?: object }`
- **Response:** `{ ok: true }`

## helpdesk
- **Method:** POST
- **Body:** `{ subject: string, message: string, category?: string }`
- **Response:** `{ ticketId: string }`

## ai-translate-i18n
- **Method:** POST · admin-only
- **Body:** `{ keys: string[], targetLang: 'en'|'ar' }`
- **Response:** `{ translations: Record<string, string> }`

## verify-2fa
- **Method:** POST
- **Body:** `{ code: string }`
- **Response:** `{ verified: boolean }`

## stripe-checkout
- **Method:** POST
- **Body:** `{ classId: string, priceId: string }`
- **Response:** `{ url: string }`

## stripe-webhook
- **Method:** POST · publiek (Stripe-signature verified)
- **Body:** Stripe event
- **Response:** `{ received: true }`

## manual-payment
- **Method:** POST · admin
- **Body:** `{ userId: string, classId: string, amount: number, note?: string }`

## export-user-data
- **Method:** POST
- **Response:** ZIP-download URL (GDPR Art. 20)

## gamification
- **Method:** POST
- **Body:** `{ action: 'award_xp'|'unlock_badge', ... }`

## grade-submission
- **Method:** POST · teacher
- **Body:** `{ submissionId: string, grade: number, feedback?: string }`

## scheduler / release-exercises / send-lesson-reminders / complete-placement / schedule-placement
- Internal cron-triggered functions. Geen externe contracts.

## health
- **Method:** GET · publiek
- **Response:** `{ status: 'ok', timestamp: string, version: string }`

---

**Validatie:** alle handlers gebruiken Zod-schema's (zie individuele `index.ts`).
**Rate limiting:** zie `docs/runbook.md` (status: in afwachting van backend-primitives).
