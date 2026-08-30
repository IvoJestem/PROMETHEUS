import os
import pandas as pd

data_dir = "data"
datasets = [
    "balance-scale",
    "breast-cancer",
    "cars",
    "house-votes",
    "lymphography",
    "mushroom",
    "nursery",
    "tic-tac-toe"
]

print(r"\begin{table}[htbp]")
print(r"\centering")
print(r"\begin{tabular}{|l|c|c|c|} \hline")
print(r"\textbf{Zbiór} & \textbf{Liczba obiektów} & \textbf{Liczba atrybutów} & \textbf{Liczba klas} \\ \hline")

# Sprawdzenie dostępnych plików w folderze data (obsługa różnych rozszerzeń i wielkości liter)
available_files = os.listdir(data_dir) if os.path.exists(data_dir) else []

for name in datasets:
    matched_file = None
    for f in available_files:
        base, ext = os.path.splitext(f)
        if base.lower() == name.lower() and ext.lower() in ['.csv', '.data', '.txt']:
            matched_file = os.path.join(data_dir, f)
            break
            
    if matched_file and os.path.exists(matched_file):
        try:
            # Automatyczne wykrywanie separatora (przecinek, średnik, spacja itp.)
            df = pd.read_csv(matched_file, sep=None, engine='python')
            num_objects = df.shape[0]
            num_attributes = df.shape[1] - 1  # Założenie: ostatnia kolumna to klasa
            num_classes = df.iloc[:, -1].nunique()
            print(f"{name} & {num_objects} & {num_attributes} & {num_classes} \\\\ \\hline")
        except Exception as e:
            print(f"{name} & Błąd odczytu & - & - \\\\ \\hline")
    else:
        print(f"{name} & Brak pliku & - & - \\\\ \\hline")

print(r"\end{tabular}")
print(r"\end{table}")