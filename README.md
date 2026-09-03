# Prometheus: System Analizy i Usuwania Niespójności w Regułach Decyzyjnych

Projekt badawczy i aplikacyjny (praca magisterska) realizujący zaawansowany potok analityczny dla systemów decyzyjnych w oparciu o teorię zbiorów przybliżonych (ang. *Rough Sets Theory*) oraz wyjaśnialną sztuczną inteligencję (XAI). System umożliwia wykrywanie niespójności, ekstrakcję reguł z rozproszonych lasów losowych (algorytm ID3) oraz ich globalną optymalizację przy użyciu Algorytmu A.

## 🛠 Stos technologiczny (Tech Stack)
* **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons
* **Backend:** Python, FastAPI, Pandas, NumPy, Scikit-learn
* **Zarządzanie procesami:** Concurrently (zintegrowany start pełnego stosu jednym poleceniem)

## 🚀 Szybki start (Quick Start)

### Wymagania wstępne
* Node.js (wersja 18+)
* Python (wersja 3.10+)

### Instalacja i uruchomienie krok po kroku
1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/IvoJestem/PROMETHEUS.git
   cd magi
   ```
2.  Zainstaluj zależności frontendu:
      ```bash
      npm install
      ```

3. Zainstaluj zależności backendu (zalecane wirtualne środowisko Python):
   ```bash
   pip install -r requirements.txt
   ```

4. Uruchom cały system (frontend + backend równolegle za pomocą skonfigurowanego skryptu):
   ```bash
   npm start
   ```

5. Otwórz przeglądarkę i przejdź pod adres: `http://localhost:5173`

## 📂 Architektura i struktura projektu
* `main.py` - główny serwer API (FastAPI) obsługujący potoki analityczne i eksperymenty badawcze.
* `analytics.py` - moduł implementujący warianty rozwiązywania niespójności:
  * **GD** (*Generalized Decision*) - zachowanie uogólnionych konfliktów decyzyjnych,
  * **MCD** (*Most Common Decision*) - decyzja większościowa (dominanta),
  * **CUSTOM / ET** (*Entropy Threshold*) - filtracja szumu informacyjnego za pomocą progu entropii ($H \le 0.85$).
* `xai_service.py` - silnik drzew i lasów losowych ID3, ekstrakcja reguł oraz Algorytm A.
* `ResearchTab.py` - moduł symulacji siatki badawczej i oceny modeli metodą walidacji.
* `src/` - komponenty interfejsu użytkownika (pulpit analityczny, macierz podatności, eksplorator reguł, raporty).
* `public/data/` - lokalny katalog przeznaczony na eksperymenty z plikami CSV (katalog pomijany w zdalnym repozytorium ze względów licencyjnych).
* `src/components/EtEasterEgg.jsx` - interaktywny komponent wizualny z animacją wektorową SVG.
* `src/utils/helpers.js` - moduł pomocniczy do konwersji reguł logicznych na czytelne komunikaty tekstowe.
* `src/constants/theme.ts` - spójna paleta kolorów interfejsu (Dark UI).

## 📊 Źródła danych (Data Sources)
Pliki CSV wykorzystywane w procesie badawczym (`balance-scale.csv`, `breast-cancer.csv`, `cars.csv`,`house-votes.csv`, `lymphography.csv`, `mushroom.csv`, `nursery.csv`, `tic-tac-toe.csv`) służą wyłącznie do celów naukowych i weryfikacji algorytmów. Zbiory te pochodzą z ogólnodostępnego **UCI Machine Learning Repository**. 

Ze względu na restrykcje licencyjne pierwotnych autorów, surowe pliki danych nie są dołączone do publicznego repozytorium kodu, należy umieścić je lokalnie w folderze `public/data/` w celu uruchomienia lokalnych analiz.

## 📄 Licencja
Projekt udostępniany jest na licencji **MIT**. Szczegółowe informacje znajdują się w pliku `LICENSE`.