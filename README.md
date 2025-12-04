# Analizator Danych: Las Losowy i Reguły Decyzyjne

Interaktywna aplikacja webowa stworzona w bibliotece **React**, służąca do eksploracji danych (Data Mining). Aplikacja działa w całości po stronie przeglądarki (client-side) i umożliwia generowanie reguł decyzyjnych z plików CSV przy użyciu algorytmów uczenia maszynowego.

## Główne Funkcje

1.  **Wczytywanie Danych**: Obsługa plików `.csv` z automatycznym wykrywaniem nagłówków.
2.  **Analiza Spójności**: Wykrywanie i automatyczna naprawa sprzeczności w danych treningowych (np. te same warunki, różne decyzje).
3.  **Algorytm ID3**: Budowanie drzew decyzyjnych w oparciu o Entropię Shannona i Zysk Informacyjny (Information Gain).
4.  **Las Losowy (Random Forest)**: Generowanie zespołu 10 drzew na podstawie losowych podzbiorów danych (metoda Bootstrap).
5.  **Ekstrakcja i Optymalizacja Reguł**: Przekształcanie drzew na reguły `JEŻELI... TO...` oraz wybór najlepszych reguł na podstawie ich wsparcia (support).
6.  **Ewaluacja Klasyfikatora**: Obliczanie dokładności (Accuracy) i pokrycia (Coverage) modelu na zbiorze danych.
7.  **Interfejs**: Obsługa trybu ciemnego/jasnego (Dark/Light Mode) oraz konsola logów.

## Wymagania i Instalacja

Projekt nie wymaga backendu. Jest to pojedynczy komponent React.

### Wymagania wstępne
* Node.js oraz npm.

### Jak uruchomić?

1.  Stwórz nową aplikację React (jeśli jeszcze jej nie masz):
    ```bash
    npx create-react-app decision-tree-app
    cd decision-tree-app
    ```

2.  Zastąp zawartość pliku `src/App.js` kodem aplikacji.

3.  Uruchom projekt:
    ```bash
    npm start
    ```

## Format Danych (CSV)

Aplikacja oczekuje prostego pliku CSV, gdzie pierwszy wiersz to nagłówki. Ostatnia kolumna jest domyślnie traktowana jako **atrybut decyzyjny** (klasa), a pozostałe jako atrybuty warunkowe.

**Przykład pliku `dane.csv`:**
```csv
Pogoda,Temperatura,Wiatr,Grać
Słonecznie,Gorąco,Słaby,Nie
Słonecznie,Gorąco,Mocny,Nie
Pochmurno,Gorąco,Słaby,Tak
Deszcz,Zimno,Słaby,Tak

```mermaid
graph TD
    A[Dane wejściowe CSV] -->|Budowa Lasu| B(Las Losowy - 10 Drzew)
    B -->|Ekstrakcja| C[Zbiór Wszystkich Surowych Reguł]
    
    subgraph Proces Optymalizacji
    C -->|Dla każdego wiersza danych| D{Szukaj pasujących reguł}
    D -->|Znaleziono wiele reguł| E[Sortowanie]
    E -->|Kryteria: 1. Max Wsparcie, 2. Min Długość| F[Wybierz 1 najlepszą regułę]
    end
    
    F --> G[Zoptymalizowany Zbiór Reguł]
    G --> H((Gotowy Klasyfikator))
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px
    style F fill:#bfb,stroke:#333,stroke-width:2px