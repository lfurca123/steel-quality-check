# Changelog

Wszystkie znaczące zmiany w tym projekcie są dokumentowane w tym pliku.

## [Unreleased]

### Added
- ✨ Kryptograficznie podpisane tokeny sesji (HMAC-SHA256) z 12-godzinnym czasem życia
- ✨ Rate limiting na logowanie PIN-em (max 5 prób / 5 minut)
- ✨ Ochrona przed timing attacks (`constantTimeCompare`)
- ✨ Sanityzacja wejścia dla numerów produktów i zapytań wyszukiwania
- ✨ Testy jednostkowe dla logiki QC i modułu bezpieczeństwa
- ✨ Konfigurowalny timezone dla obliczenia zmian roboczych
- ✨ Refaktor komponentów mobilnych: ProductNumberInput, MeasureInput, F3Screen, ZgodneScreen
- ✨ Seed migracja z testowymi pracownikami (PIN: 1234, 5678, 0000)
- 📝 Polskie tłumaczenia komunikatów błędów w root layout
- 🛠️ Dodane skrypty testowe: `npm test` i `npm test:watch`

### Changed
- 🔐 Funkcja `loginWithPin()` obsługuje teraz tokeny sesji
- 🔐 Funkcja `saveSkoInspections()` obsługuje teraz tokeny sesji
- 🔐 Funkcja `searchInspections()` obsługuje teraz tokeny sesji i sanityzuje zapytania
- 📝 Polskie komunikaty walidacji Zod
- ⚙️ Dodana zmienna `.env` `VITE_SHIFT_TIMEZONE` (domyślnie: Europe/Warsaw)

### Fixed
- 🐛 Brak polskich tłumaczeń w komunikatach błędów 404 i500
- 🐛 Hardcodowany timezone zamiast konfigurowalnego
- 🐛 Możliwość SQL injection w wyszukiwaniu (ulepszona sanityzacja)
- 🐛 Brak ochrony przed brute force na PIN

### Security
- 🔒 Dodane rate limiting dla logowania
- 🔒 Tokeny sesji z kryptograficznym podpisem
- 🔒 Sanityzacja wszystkich wejść użytkownika
- 🔒 Constant-time comparison dla PIN-ów
- 🔒 Ochrona przed timing attacks

### Development
- 🧪 Dodane testy jednostkowe dla `qc.ts` i `security.ts`
- 🧪 Konfiguracja Vitest
- 📦 Zaktualizowane zależności dev (vitest, @vitest/ui)

## [0.1.0] - 2026-09-27

### Added
- 🎯 Początkowy prototyp systemu kontroli jakości SKO
- 📱 Aplikacja webowa zoptymalizowana na telefony i komputery
- 🔐 Logowanie pracownika PIN-em
- 📊 Formularz kontroli 4 sztuk SKO
- 💾 Zapis danych do Supabase
- 🔍 Wyszukiwanie i przeglądanie kontroli
- 🏢 Branding firmy Migra
- 🎨 Design interfejsu z TailwindCSS + Radix UI
