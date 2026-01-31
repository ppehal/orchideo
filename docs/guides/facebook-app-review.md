# Facebook App Review - Návod

Tento návod popisuje jak získat schválení pro Pages permissions od Facebooku.

## Požadované permissions pro Orchideo

| Permission                | Účel                                              |
| ------------------------- | ------------------------------------------------- |
| `pages_show_list`         | Zobrazení seznamu FB stránek uživatele            |
| `pages_read_engagement`   | Čtení engagement metrik (likes, comments, shares) |
| `pages_read_user_content` | Čtení příspěvků a obsahu ze stránky               |
| `read_insights`           | Čtení insights/statistik stránky                  |

## Předpoklady

Před submitnutím App Review potřebuješ:

- [ ] **Privacy Policy URL** - veřejně dostupná stránka
- [ ] **Terms of Service URL** (volitelné, ale doporučené)
- [ ] **App Icon** (1024x1024 px)
- [ ] **Screenshoty/Video** jak aplikace používá permissions
- [ ] **Testovací účet** pro Facebook reviewera

## Step-by-step postup

### 1. Nastav App Basic Settings

1. Jdi do **App settings** → **Basic**
2. Vyplň povinná pole:
   - **App Domains:** `localhost`, `orchideo.ppsys.eu`
   - **Privacy Policy URL:** `https://orchideo.ppsys.eu/privacy`
   - **Terms of Service URL:** `https://orchideo.ppsys.eu/terms`
   - **App Icon:** nahraj logo
   - **Category:** vyber relevantní (např. "Business")
3. Klikni **Save Changes**

### 2. Přejdi do App Review

1. V levém menu: **Review** → **Requests** (nebo **Permissions and Features**)

### 3. Požádej o jednotlivé permissions

Pro každou permission:

1. Najdi permission v seznamu → klikni **"Request"**
2. Vyplň formulář s vysvětlením použití
3. Přidej screenshoty UI

**Vzorové popisy:**

#### `pages_show_list`

> "Aplikace zobrazuje seznam Facebook stránek uživatele, aby si mohl vybrat kterou stránku chce analyzovat pro marketingové účely."

#### `pages_read_engagement`

> "Aplikace čte engagement metriky (likes, comments, shares) příspěvků na vybrané stránce pro analýzu výkonu obsahu."

#### `pages_read_user_content`

> "Aplikace čte příspěvky a obsah ze stránky pro analýzu a generování doporučení na základě triggerů."

#### `read_insights`

> "Aplikace čte insights/statistiky stránky pro zobrazení analytických reportů a trendů."

### 4. Přidej testovací instrukce

```
Testing Instructions:

1. Go to https://orchideo.ppsys.eu
2. Click "Přihlásit se přes Facebook"
3. Authorize the application
4. Select a Facebook Page you manage
5. Navigate to "Analýzy" to see the analysis dashboard
6. Click on any trigger to see detailed recommendations

Test account (if needed):
Email: [poskytni testovací účet]
Password: [heslo]
```

### 5. Data Use Checkup

Vyplň jak aplikace nakládá s daty:

- Data se používají pouze pro analýzu a generování doporučení
- Data se neukládají dlouhodobě (nebo specifikuj retention policy)
- Data se nesdílí s třetími stranami

### 6. Submit for Review

1. Zkontroluj že vše je vyplněné (zelené checkmarky)
2. Klikni **"Submit for Review"**
3. Čekej na schválení (typicky 1-5 pracovních dnů)

## Časté důvody zamítnutí

- Chybí Privacy Policy
- Screenshoty neukazují jasně použití permission
- Nedostatečné vysvětlení proč permission potřebuješ
- Aplikace není funkční pro testera

## Po schválení

Po schválení se permissions změní ze "Standard Access" na "Advanced Access" a budou fungovat pro všechny uživatele, nejen pro testery.

---

_Dokumentace vytvořena: 2026-01-30_
