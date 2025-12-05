# 🌲 Analizator Danych - Las Losowy (Random Forest Explorer)

Aplikacja webowa typu SPA (Single Page Application) stworzona w bibliotece **React**, służąca do analizy danych, ekstrakcji reguł decyzyjnych oraz walidacji modeli klasyfikacyjnych w oparciu o algorytm **Lasu Losowego (Random Forest)**.

Całość obliczeń (budowanie drzew, obliczanie entropii, walidacja) odbywa się **w pełni po stronie klienta (w przeglądarce)**, bez konieczności użycia backendu.

## 🚀 Funkcjonalności

### 1. Przetwarzanie Danych
* **Import CSV:** Obsługa plików tekstowych w formacie CSV.
* **Analiza Spójności:** Automatyczne wykrywanie duplikatów oraz **konfliktów decyzyjnych** (sytuacji, gdzie te same atrybuty warunkowe prowadzą do różnych decyzji).
* **Statystyki Podstawowe:** Liczba wierszy, kolumn, identyfikacja klasy decyzyjnej.

### 2. Generowanie Reguł (Analiza)
* **Las Losowy:** Budowa 10 niezależnych drzew decyzyjnych na podstawie losowych próbek danych.
* **Ekstrakcja Reguł:** Przekształcanie struktur drzewiastych na zbiór reguł `JEŻELI ... TO ...`.
* **Statystyki Szczegółowe:**
    * Analiza długości reguł (L).
    * Analiza wsparcia reguł (S - Support).
    * Wyliczanie średnich (względem liczby kolumn i wierszy), minimów i maksimów.

### 3. Walidacja Modelu (Train & Test)
* **Podział Stratyfikowany:** Możliwość podziału zbioru na treningowy i testowy za pomocą suwaka (np. 70% / 30%).
* **Trening:** Budowa modelu walidacyjnego na zbiorze treningowym.
* **Ewaluacja (Test):** Klasyfikacja zbioru testowego i generowanie macierzy pomyłek.
* **Metryki:**
    * Accuracy (Dokładność).
    * Macro Precision, Macro Recall, Macro F1.

### 4. Interfejs Użytkownika
* Tryb Jasny / Ciemny (Dark Mode).
* Logi operacyjne w czasie rzeczywistym.
* Tabela statystyk dla każdego drzewa w lesie.

---

## 🛠️ Wymagania i Instalacja

Do uruchomienia projektu potrzebne jest środowisko **Node.js**.

1.  **Sklonuj repozytorium lub pobierz pliki:**
    ```bash
    git clone [https://github.com/twoj-login/analizator-las-losowy.git](https://github.com/twoj-login/analizator-las-losowy.git)
    cd analizator-las-losowy
    ```

2.  **Zainstaluj zależności:**
    ```bash
    npm install
    # lub
    yarn install
    ```
    *Uwaga: Projekt wymaga jedynie biblioteki `react` oraz `react-dom`.*

3.  **Uruchom aplikację:**
    ```bash
    npm start
    ```
    Aplikacja otworzy się pod adresem `http://localhost:3000`.

---

## 📄 Format Danych Wejściowych

Aplikacja oczekuje plików **CSV** sformatowanych w następujący sposób:

1.  **Nagłówki:** Pierwszy wiersz musi zawierać nazwy atrybutów.
2.  **Atrybuty:** Dowolna liczba kolumn z danymi (liczby lub napisy).
3.  **Klasa Decyzyjna:** Ostatnia kolumna jest zawsze traktowana jako **target** (klasa decyzyjna).
4.  **Separator:** Przecinek (`,`).

**Przykładowy plik `dane.csv`:**
```csv
Pogoda,Temperatura,Wilgotnosc,Wiatr,Decyzja
Slonecznie,Goraco,Wysoka,Slaby,Nie
Slonecznie,Goraco,Wysoka,Silny,Nie
Pochmurno,Goraco,Wysoka,Slaby,Tak
Deszcz,Umiarkowana,Wysoka,Slaby,Tak
Deszcz,Zimna,Normalna,Slaby,Tak
Deszcz,Zimna,Normalna,Silny,Nie