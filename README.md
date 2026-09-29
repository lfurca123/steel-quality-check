# Steel Quality Check

DOKUMENT STARTOWY — APLIKACJA KONTROLI JAKOŚCI SKO

1. Cel projektu
   Chcę stworzyć system do obsługi kontroli jakości produktów w seryjnej produkcji konstrukcji stalowych.
   Obecnie część procesu kontroli odbywa się w sposób papierowy. Celem jest stworzenie aplikacji, która pozwoli pracownikom wykonywać kontrole na telefonach, automatycznie zapisywać wyniki w centralnej bazie danych oraz umożliwi późniejsze wyszukiwanie i odczytywanie zapisanych danych na komputerach firmowych.
   Projekt ma być początkowo wykonany jako działający prototyp, który można przetestować przed wdrożeniem firmowym. Po sprawdzeniu działania aplikacja będzie stopniowo rozbudowywana o kolejne produkty, rodzaje kontroli i funkcje.
   Nie chcę budować całego systemu jednocześnie. Należy rozwijać go etapami, zaczynając od działającego prototypu, a następnie dodawać kolejne elementy.

2. Docelowe urządzenia i platformy
   Aplikacja webowa zoptymalizowana na telefony i komputery.
   Telefony (Android / iPhone):
   Na telefonach ma być dostępna pełna funkcjonalność wykonywania kontroli jakości:

- logowanie pracownika PIN-em
- wykonywanie kontroli
- wprowadzanie pomiarów
- automatyczne obliczanie wyników
- zapis danych do bazy
- wyszukiwanie historii

Komputery firmowe (PC z Windows):
Na komputerach Windows w przeglądarce użytkownik ma mieć możliwość:

- wyszukiwania zapisanych kontroli
- przeglądania zapisanych danych
- wyświetlania szczegółów kontroli
  Na komputerach Windows NIE ma być możliwości:
- dodawania nowych kontroli
- wprowadzania wyników pomiarów
- tworzenia nowych rekordów kontroli
- edytowania zapisanych kontroli
- usuwania kontroli

6. Logowanie
   Aplikacja ma posiadać logowanie pracownika.
   Każdy pracownik ma indywidualny PIN (na start przygotować predefiniowanych pracowników z prostymi PIN-ami do testów, np. Jan Kowalski PIN: 1234, Anna Nowak PIN: 5678).
   Po wpisaniu poprawnego PIN-u aplikacja zna tożsamość pracownika i automatycznie przypisuje jego imię i nazwisko do wykonywanych kontroli.
   Po zalogowaniu ekran główny zawiera:

- NOWA KONTROLA
- WYSZUKAJ KONTROLĘ
  oraz informację o aktualnie zalogowanym pracowniku.

7. Produkty
   Po wybraniu „NOWA KONTROLA” użytkownik ma otrzymać:

- SKO
- Produkt 1 (nieaktywny/placeholder)
- Produkt 2 (nieaktywny/placeholder)
  SKO jest pierwszym rzeczywistym produktem z pełną funkcjonalnością.

8. Model kontroli SKO
   Jedna fizyczna operacja kontroli obejmuje jednocześnie 4 sztuki SKO, aby usprawnić pracę operatora.
   Te 4 sztuki:

- NIE są zestawem,
- NIE tworzą jednego produktu,
- NIE mają wspólnego wyniku,
- NIE mają wspólnego rekordu w bazie.
  Każda sztuka jest całkowicie niezależną kontrolą i osobnym rekordem w bazie:
  Sztuka 1 -> osobny rekord -> OK/NOK
  Sztuka 2 -> osobny rekord -> OK/NOK
  Sztuka 3 -> osobny rekord -> OK/NOK
  Sztuka 4 -> osobny rekord -> OK/NOK
  Nie zapisujemy informacji, że te cztery sztuki były kontrolowane jednocześnie. Nie potrzebujemy identyfikatora sesji/grupy.

9. Numery produktów SKO
   Ręczne wpisanie czterech numerów (np. SKO-00101, SKO-00102, SKO-00103, SKO-00104).

10. Dane zapisywane dla pojedynczej sztuki
    Każdy rekord kontroli SKO zawiera:

- identyfikator techniczny rekordu,
- produkt (SKO),
- numer produktu,
- datę i godzinę,
- zmianę,
- kontrolera,
- wartość F1,
- wynik F1,
- wartość F2,
- wynik F2,
- wynik F3,
- wynik „Zgodne”,
- końcowy wynik kontroli.

11. Zmiana
    Określana automatycznie na podstawie godziny:

- I zmiana: 06:00–14:00
- II zmiana: 14:00–22:00
- Poza tym zakresem: Poza zmianą
  Użytkownik nie wybiera zmiany ręcznie.

12. Kontrola F1
    Pomiar liczbowy:

- dokładność: 0,1 mm
- zakres dopuszczalny: 0,0–2,0 mm włącznie.
  Aplikacja automatycznie określa wynik:
  wartość w zakresie -> OK, poza zakresem -> NOK.
  Zapisywana jest rzeczywista wartość pomiaru oraz automatycznie obliczony wynik.

13. Kontrola F2
    Pomiar liczbowy:

- dokładność: 0,1 mm
- zakres dopuszczalny: 0,0–5,0 mm włącznie.
  Aplikacja automatycznie oblicza wynik OK/NOK.
  Kolejność wykonywania kontroli:
  Dla każdej ze sztuk 1, 2, 3, 4 po kolei wprowadzane są pomiary F1 i F2.

14. Kontrola F3
    Dostępne wyłącznie przyciski: [OK] [NOK].
    Po zakończeniu F1 i F2 dla wszystkich czterech sztuk pojawia się ekran F3 dla wszystkich czterech sztuk.

15. Kontrola „Zgodne”
    Dla każdej sztuki dostępne: [TAK] [NIE].
    Jeden ekran dla wszystkich czterech sztuk.

16. Końcowy wynik kontroli
    Zatwierdzona reguła logiczna:
    Końcowy wynik dla pojedynczej sztuki to OK tylko wtedy, gdy:
    F1 = OK oraz F2 = OK oraz F3 = OK oraz Zgodne = TAK.
    W przeciwnym wypadku wynik to NOK.
    Każda sztuka ma swój własny końcowy wynik.

17. Podsumowanie przed zapisaniem
    Przed zatwierdzeniem kontroli aplikacja pokazuje cztery niezależne wyniki dla każdej ze sztuk ze szczegółami (F1, F2, F3, Zgodne, WYNIK).
    Przyciski: [POPRAW DANE] [ZATWIERDŹ].
    Brak jednego wspólnego wyniku SKO.

18. Zapisywanie
    Po zatwierdzeniu aplikacja zapisuje w centralnej bazie danych (Lovable Cloud / backend) cztery niezależne rekordy.
    Pokazuje potwierdzenie: Zapisano 4 kontrole z listą numerów i ich wynikami, następnie powrót do ekranu głównego.

19. Wyszukiwanie kontroli
    Dostępne na telefonie i w widoku PC:

- pole wyszukiwania numeru produktu (obsługujące częściowe dopasowanie, np. wpisanie 00103 znajduje SKO-00103),
- przycisk SZUKAJ,
- lista 10 ostatnio zapisanych kontroli (data, numer produktu, kontroler, wynik).
  Kliknięcie w rekord pokazuje pełne szczegóły pojedynczej kontroli (produkt, numer, data, zmiana, kontroler, F1 z wynikiem, F2 z wynikiem, F3, Zgodne, wynik końcowy) bez informacji o pozostałych sztukach.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://steel-quality-check.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3b426bde-5103-4469-8bde-c6bb2962dfc6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
