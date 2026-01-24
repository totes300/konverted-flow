# Git Parancsok

## Commit és Push

### Gyors commit és push (egy sorban)
```bash
git add . && git commit -m "commit üzenet" && git push
```

### Lépésről lépésre
```bash
git add .                        # Minden változás hozzáadása
git commit -m "üzenet"          # Commit
git push                         # Push az origin/main-re
```

### Csak bizonyos fájlok hozzáadása
```bash
git add fájlnév1 fájlnév2       # Konkrét fájlok
git commit -m "üzenet"
git push
```

## Verziók Visszahúzása

### Utolsó commit visszavonása (változások megmaradnak)
```bash
git reset --soft HEAD~1
```

### Utolsó commit visszavonása (változások eldobása)
```bash
git reset --hard HEAD~1
```

### Konkrét verzióhoz visszatérés
```bash
git log --oneline               # Commit hash-ek listázása
git reset --hard <commit-hash>  # Visszaugrás az adott verzióra
```

### Ha már pusholtál és vissza akarsz állni
```bash
git reset --hard <commit-hash>
git push --force                # ⚠️ Óvatosan! Felülírja a remote-ot
```

### Utolsó N commit visszavonása
```bash
git reset --hard HEAD~3         # Utolsó 3 commit visszavonása
```

## Ellenőrző Parancsok

```bash
git status                      # Aktuális változások
git log --oneline -10           # Utolsó 10 commit
git log --oneline --graph       # Commit történet gráfként
git diff                        # Módosítások megtekintése
git diff --staged               # Staged változások megtekintése
```

## Branch Műveletek

```bash
git branch                      # Összes branch listázása
git branch új-branch            # Új branch létrehozása
git checkout új-branch          # Váltás másik branchre
git checkout -b új-branch       # Létrehozás és váltás egy lépésben
git branch -d branch-név        # Branch törlése
```

## Hasznos Alias-ok (Opcionális)

Írd be ezeket egyszer, aztán rövidebb lesz:

```bash
echo 'alias gac="git add . && git commit -m"' >> ~/.zshrc
echo 'alias gp="git push"' >> ~/.zshrc
echo 'alias gs="git status"' >> ~/.zshrc
echo 'alias gl="git log --oneline -10"' >> ~/.zshrc
source ~/.zshrc
```

### Alias-ok használata
```bash
gac "commit üzenet" && gp       # Commit és push egy sorban
gs                              # Status
gl                              # Utolsó 10 commit
```

## Gyakori Helyzetek

### Véletlenül commitoltam, de még nem pusholtam
```bash
git reset --soft HEAD~1         # Visszavonom, változások megmaradnak
# Javítom a fájlokat
git add .
git commit -m "javított üzenet"
git push
```

### Vissza akarok térni egy korábbi verzióhoz
```bash
git log --oneline               # Megkeresem a commit hash-t
git reset --hard abc1234        # Visszatérek
git push --force                # Remote frissítése
```

### Módosítások eldobása (még nem commitoltam)
```bash
git restore .                   # Minden változás eldobása
git restore fájlnév             # Egy fájl visszaállítása
```

### Legutóbbi commit üzenetének módosítása
```bash
git commit --amend -m "új üzenet"
git push --force                # Ha már pusholva volt
```
