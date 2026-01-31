# Facebook Graph API Integration

> Integration with Facebook Graph API for page data fetching.

## Overview

Orchideo uses Facebook Graph API to:

- Authenticate users via Facebook OAuth
- List user's managed pages
- Fetch page insights and metrics
- Retrieve post engagement data

---

## Facebook App Setup

### Proč Facebook Login for Business?

Standardní Facebook Login **neposkytuje přístup k Pages permissions** (pages_show_list, pages_read_engagement, atd.) v development módu. Tyto permissions vyžadují App Review.

**Facebook Login for Business** umožňuje:

- Přístup k Pages permissions bez App Review (pro adminy/testery)
- Konfiguraci permissions přes `config_id` místo `scope`
- Development a testování s plnými právy

### Krok 1: Vytvoření Facebook App

1. Jdi na [Facebook Developers](https://developers.facebook.com/apps/)
2. Klikni **"Create App"**
3. Vyber **"Allow people to log in with their Facebook account"**
4. Vyber typ: **"None"** (nebo Business pokud máš Business Portfolio)
5. Vyplň název aplikace (např. "Orchideo")
6. Klikni **"Create App"**

### Krok 2: Přidání Facebook Login for Business

1. V levém menu: **"Add Product"** nebo **"Use cases"**
2. Najdi **"Facebook Login for Business"** (NE standardní Facebook Login!)
3. Klikni **"Set Up"**

### Krok 3: Konfigurace Permissions

1. V levém menu: **"Facebook Login for Business"** → **"Configuration"**
2. V sekci **"Login permissions"** přidej:
   - `email`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `read_insights`
3. Klikni **"Save"**
4. **Zapiš si `config_id`** - zobrazí se v URL nebo v nastavení konfigurace

### Krok 4: OAuth Redirect URIs

1. V **"Facebook Login for Business"** → **"Settings"**
2. Do **"Valid OAuth Redirect URIs"** přidej:
   ```
   http://localhost:3001/api/auth/callback/facebook
   https://orchideo.ppsys.eu/api/auth/callback/facebook
   ```
3. Klikni **"Save Changes"**

### Krok 5: Získání App Credentials

1. Jdi do **"App settings"** → **"Basic"**
2. Zapiš si:
   - **App ID** (číslo)
   - **App Secret** (klikni "Show")

### Krok 6: Přidání Admin/Tester Role

Pro development mód musí být uživatel přidán jako admin nebo tester:

1. **"App roles"** → **"Roles"**
2. Klikni **"Add People"**
3. Přidej Facebook účet jako **Administrator** nebo **Tester**
4. Uživatel musí přijmout pozvánku na Facebooku

---

## Environment Variables

```env
# Facebook OAuth - Facebook Login for Business
FACEBOOK_APP_ID="1605455470467424"
FACEBOOK_APP_SECRET="your_app_secret_here"
FACEBOOK_CONFIG_ID="655031237668794"
```

---

## NextAuth.js Konfigurace

```typescript
// src/lib/auth.ts
import Facebook from 'next-auth/providers/facebook'

Facebook({
  clientId: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  authorization: {
    url: 'https://www.facebook.com/v21.0/dialog/oauth',
    params: {
      // Facebook Login for Business - uses config_id instead of scope
      // Config includes: email, pages_show_list, pages_read_engagement,
      // pages_read_user_content, read_insights
      config_id: process.env.FACEBOOK_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: 'true',
    },
  },
  // Allow linking new Facebook app account to existing user with same email
  allowDangerousEmailAccountLinking: true,
}),
```

**Důležité:** `allowDangerousEmailAccountLinking: true` je nutné pokud měníš Facebook App - jinak dostaneš `OAuthAccountNotLinked` error.

---

## Authentication Flow

```
1. User clicks "Connect Facebook"
           │
           ▼
2. Redirect to Facebook OAuth
   (config_id defines permissions)
           │
           ▼
3. User grants permissions
           │
           ▼
4. Callback with auth code
           │
           ▼
5. Exchange code for access token
           │
           ▼
6. Store access_token in Account table
```

---

## Required Permissions

| Permission                | Purpose                         | Získání                     |
| ------------------------- | ------------------------------- | --------------------------- |
| `email`                   | User email                      | Automaticky dostupné        |
| `public_profile`          | User name, picture              | Automaticky dostupné        |
| `pages_show_list`         | List user's pages               | Facebook Login for Business |
| `pages_read_engagement`   | Read page engagement stats      | Facebook Login for Business |
| `pages_read_user_content` | Read page posts                 | Facebook Login for Business |
| `read_insights`           | Access page insights            | Facebook Login for Business |
| `business_management`     | Access Business Portfolio pages | Facebook Login for Business |

---

## API Endpoints Used

### GET /me/accounts

List pages directly managed by user (personal pages).

```typescript
const response = await fetch(
  `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,picture.type(large),tasks,access_token`,
  { signal: AbortSignal.timeout(30000) }
)
```

### GET /me/businesses

List Business Portfolios owned by user.

```typescript
const response = await fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name`, {
  signal: AbortSignal.timeout(30000),
})
```

### GET /{business-id}/owned_pages

List pages owned by a Business Portfolio.

```typescript
const response = await fetch(
  `https://graph.facebook.com/v21.0/${businessId}/owned_pages?fields=id,name,category,picture.type(large),tasks,access_token`,
  { signal: AbortSignal.timeout(30000) }
)
```

> **Note:** `getManagedPages()` aggregates pages from both `/me/accounts` (personal) and `/{business-id}/owned_pages` (Business Portfolio), with automatic deduplication.

### GET /{page-id}/feed

Fetch page posts.

```typescript
const response = await fetch(
  `https://graph.facebook.com/v21.0/${pageId}/feed?fields=id,message,created_time&access_token=${token}`,
  { signal: AbortSignal.timeout(30000) }
)
```

### GET /{page-id}/insights

Fetch page insights.

```typescript
const metrics = ['page_impressions', 'page_engaged_users', 'page_post_engagements']
const response = await fetch(
  `https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metrics.join(',')}&access_token=${token}`,
  { signal: AbortSignal.timeout(30000) }
)
```

---

## Troubleshooting

### "Invalid Scopes" error

**Příčina:** Používáš standardní Facebook Login místo Facebook Login for Business.

**Řešení:**

1. Přidej "Facebook Login for Business" produkt do aplikace
2. Nakonfiguruj permissions v config
3. Použij `config_id` místo `scope` v NextAuth konfiguraci

### "OAuthAccountNotLinked" error

**Příčina:** Uživatel už existuje v databázi, ale s jiným Facebook providerAccountId (např. po změně Facebook App).

**Řešení:**

1. Přidej `allowDangerousEmailAccountLinking: true` do Facebook provideru
2. Nebo smaž staré Account záznamy z databáze:
   ```sql
   DELETE FROM "Account" WHERE provider = 'facebook';
   ```

### "Application has been deleted" error

**Příčina:** V databázi jsou tokeny ze staré/smazané Facebook aplikace.

**Řešení:**

```sql
DELETE FROM "Account" WHERE provider = 'facebook';
```

Pak se uživatel musí znovu přihlásit.

### Business Portfolio stránky se nezobrazují

**Příčina:** Chybí `business_management` permission.

**Řešení:**

1. Přidej `business_management` do Facebook Login for Business konfigurace
2. Uživatel se musí odhlásit a znovu přihlásit pro refresh permissions
3. Zkontroluj logy - mělo by být: `Aggregated managed pages { personalPages: X, businesses: Y, businessPages: Z }`

**Poznámka:** Pokud permission chybí, aplikace funguje dál (graceful degradation) - zobrazí pouze osobní stránky.

### Feed vrací 0 příspěvků

**Možné příčiny:**

1. Stránka nemá žádné příspěvky
2. Příspěvky jsou starší než 90 dní (default cutoff)
3. Uživatel není admin stránky

**Ověření:**

```bash
curl "https://graph.facebook.com/v21.0/{page-id}/feed?access_token={token}"
```

### "Invalid insights metric" error

**Příčina:** Některé metriky nejsou dostupné pro malé/neaktivní stránky.

**Řešení:** Toto je očekávané chování - aplikace pokračuje bez insights.

---

## Rate Limiting

Facebook API has strict rate limits:

- 200 calls per hour per user
- 4800 calls per 24 hours per app

Implementation:

- Cache responses where possible
- Batch requests when feasible
- Implement exponential backoff on 429 errors

---

## Token Management

- Access tokens are stored in `Account` table
- Page access tokens are stored in `FacebookPage` table (encrypted)
- Tokens are stored in database, never in cookies/localStorage

---

## Testing

### Graph API Explorer

Pro rychlé testování API:

1. Jdi na [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Vyber aplikaci "Orchideo"
3. Klikni "Generate Access Token"
4. Vyber permissions
5. Testuj endpoint: `GET /me/accounts`

### Access Token Debugger

Pro ověření tokenu: [Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)

---

## Useful Links

- [Facebook Developers Dashboard](https://developers.facebook.com/apps/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/)
- [Page Insights](https://developers.facebook.com/docs/graph-api/reference/page/insights/)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)

---

## App Review (pro produkci)

Pro veřejné použití (ne jen admini/testeři) je nutný App Review:

1. Viz `docs/guides/facebook-app-review.md`
2. Potřebuješ Privacy Policy, screenshoty, video demo
3. Typicky trvá 1-5 pracovních dnů

---

_Poslední aktualizace: 2026-01-31 (Business Portfolio support)_
