# 🌲 Optymalizacja Reguł Decyzyjnych (Global Rules AI)

Aplikacja stworzona w architekturze **Klient-Serwer (React + Python FastAPI)** w ramach pracy magisterskiej. Projekt służy do globalnej optymalizacji reguł decyzyjnych na podstawie danych rozproszonych. 

Lokalne źródła danych są symulowane przez zbiory reguł indukowanych z **Lasów Losowych (Random Forest)**. Rdzeniem optymalizacji jest implementacja **Algorytmu A (Moshkov)**, który pozwala na ekstrakcję globalnych wzorców (wiedzy wspólnej) oraz redukcję szumu lokalnego.

## 🚀 Architektura i Funkcjonalności

Projekt został podzielony na dwie warstwy:

### 1. Backend (Silnik Analityczny - Python)
* **Las Losowy:** Budowa lasów losowych przy użyciu biblioteki `scikit-learn`.
* **Ekstrakcja:** Przekształcanie węzłów drzew (Black-Box) w czytelne reguły (White-Box).
* **Algorytm A:** Wyliczanie współczynnika wsparcia (support) dla wszystkich unikalnych reguł względem wszystkich drzew w lesie.
* **Optymalizacja i Klasyfikacja:** Odrzucanie reguł specyficznych lokalnie (Support = 1) i klasyfikowanie zbioru testowego zoptymalizowaną Listą Decyzyjną z wykorzystaniem głosowania większościowego (Majority Voting).

### 2. Frontend (Panel Analityczny - React / Vite)
* **Integracja z UCI ML:** Predefiniowana lista wbudowanych zbiorów danych z repozytorium UCI Machine Learning (m.in. *cars, mushroom, breast-cancer*).
* **Wizualizacja Wsparcia:** Interaktywna analiza współczynnika wsparcia z wykresem kompresji wiedzy.
* **Statystyki Dashboard:** Kafelki metryk w czasie rzeczywistym prezentujące Accuracy (trafność), Macro F1 oraz stopień redukcji reguł.

---

## 🛠️ Wymagania i Instalacja

Projekt wymaga uruchomienia dwóch środowisk jednocześnie: serwera obliczeniowego w Pythonie oraz interfejsu w Node.js.

### KROK 1: Uruchomienie Serwera (Backend)
Wymagany zainstalowany **Python 3.9+**.

1. Przejdź do głównego folderu projektu.
2. (Opcjonalnie) Stwórz wirtualne środowisko: `python -m venv venv` i aktywuj je.
3. Zainstaluj wymagane biblioteki:
   ```bash
   pip install fastapi uvicorn pandas scikit-learn python-multipart
    ```
    4. Uruchom serwer API:
   ```bash
   uvicorn main:app --reload
   ```
   Serwer uruchomi się pod adresem http://localhost:8000 i będzie nasłuchiwał żądań od interfejsu.
   ### KROK 2: Uruchomienie Interfejsu (Frontend)
   Wymagany zainstalowany **Node.js**. Otwórz nowe okno terminala w głównym folderze projektu.
   1. Zainstaluj pakiety:
   ```bash
   npm install
   ```
   2. Uruchom serwer deweloperski Vite:
   ```bash
   npm run dev
   ```
  Aplikacja otworzy się w przeglądarce pod adresem http://localhost:5173 (lub innym wskazanym w konsoli). 
## 📄 Format Danych Wejściowych
Aplikacja posiada wbudowane zbiory danych z repozytorium UCI ML, jednak umożliwia też wgranie własnych plików **CSV**, sformatowanych w następujący sposób:
1. **Nagłówki:** Pierwszy wiersz musi zawierać nazwy atrybutów.
2. **Atrybuty:** Wartości liczbowe lub tekstowe (automatycznie mapowane przez LabelEncoder).
3. **Klasa Decyzyjna:** Ostatnia kolumna jest traktowana jako target.
4. **Separator:** Przecinek (,).
Przykład:
```python
buying,maint,doors,persons,lug_boot,safety,class
vhigh,vhigh,2,2,small,low,unacc
vhigh,vhigh,2,2,small,med,unacc
vhigh,vhigh,2,2,small,high,unacc
   ```