# Verwerkingsregister (GDPR Art. 30)

Laatst bijgewerkt: 2026-06-10. Eigenaar: DPO / Admin.

## Verwerkingsverantwoordelijke

Huis van het Arabisch — contact: privacy@huisvanhetarabisch.nl.

## Doel en grondslag

| Doel | Categorieën betrokkenen | Categorieën persoonsgegevens | Grondslag |
|------|-------------------------|-------------------------------|-----------|
| Account & authenticatie | Studenten, docenten, admins | E-mail, wachtwoord-hash, naam, MFA-secret | Uitvoering overeenkomst |
| Voortgangsregistratie | Studenten | Antwoorden, scores, badges, XP | Uitvoering overeenkomst |
| Live lessen & opnames | Studenten, docenten | Aanwezigheid, video-opnames | Uitvoering + toestemming opname |
| Betalingen | Studenten | Naam, factuuradres, betaal-referentie | Wettelijke verplichting + overeenkomst |
| Support & helpdesk | Allen | Tickets, bijlagen | Gerechtvaardigd belang |
| Privacy-vriendelijke analytics | Allen | Geanonimiseerde events, IP-prefix | Gerechtvaardigd belang |
| Marketing-e-mails | Opt-in studenten | E-mail, voorkeur | Toestemming |

## Bewaartermijnen

| Datatype | Bewaartermijn |
|----------|---------------|
| Account (actief) | Tot verwijdering door gebruiker |
| Account (inactief) | 24 maanden, daarna automatische anonimisering |
| Betaalgegevens | 7 jaar (fiscale bewaarplicht) |
| Lesopnames | 12 maanden na cursus-einde |
| Audit logs | 24 maanden |
| Analytics events | 13 maanden |
| Support-tickets | 24 maanden na sluiting |

## Subverwerkers

| Subverwerker | Doel | Land | DPA |
|--------------|------|------|-----|
| Supabase (Lovable Cloud) | Database, auth, storage, functions | EU (eu-central-1) | `docs/legal/dpa/supabase.pdf` |
| Resend | Transactionele e-mail | EU/VS (SCC) | `docs/legal/dpa/resend.pdf` |
| Stripe | Betalingen | EU/VS (SCC) | `docs/legal/dpa/stripe.pdf` |
| Cloudflare Turnstile | Bot-bescherming | Wereldwijd | `docs/legal/dpa/cloudflare.pdf` |
| Lovable | Hosting & deploy | EU | `docs/legal/dpa/lovable.pdf` |

## Rechten van betrokkenen

- **Inzage / portabiliteit**: `Instellingen → Mijn gegevens exporteren` → JSON-download via `export-user-data` edge function.
- **Verwijdering (Art. 17)**: `Instellingen → Account verwijderen` → `delete-user-data` edge function; cascade via FK + storage purge + `auth.admin.deleteUser`.
- **Rectificatie**: profielvelden direct bewerkbaar.
- **Bezwaar / beperking**: e-mail naar privacy@huisvanhetarabisch.nl; SLA 30 dagen.

## Beveiligingsmaatregelen

Row-Level Security op alle tabellen, MFA voor admins, TLS 1.3, rate limiting op edge functions, Turnstile op publieke formulieren, structured audit logging, PITR-backups (RPO 5m / RTO 1u). Zie `docs/backup-dr.md` en `docs/runbook.md`.

## Datalek-procedure

Zie `docs/runbook.md` § Incident response. Melding aan AP binnen 72 uur.
