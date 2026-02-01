# Deployment Guide - Konverted Flow

## Architecture Overview

| Environment | URL | Git Branch | Vercel | Convex | Clerk |
|-------------|-----|------------|--------|--------|-------|
| **Production** | https://app.konverted.io | `main` | Production | `hip-ptarmigan-846` | Production (`pk_live_*`) |
| **Staging** | https://staging.konverted.io | `staging` | Preview | `calm-canary-782` | Development (`pk_test_*`) |

---

## Convex Deployments

### Production: `hip-ptarmigan-846`
- URL: `https://hip-ptarmigan-846.convex.cloud`
- Deploy Key: `prod:hip-ptarmigan-846|...`

### Staging/Development: `calm-canary-782`
- URL: `https://calm-canary-782.convex.cloud`
- Deploy Key: `dev:calm-canary-782|...`

### Convex Environment Variables (set in Convex Dashboard)

**Production (`hip-ptarmigan-846`):**
- `CLERK_JWT_ISSUER_DOMAIN` = `https://clerk.konverted.io`
- `OPENAI_API_KEY` = (OpenAI API key)

**Staging (`calm-canary-782`):**
- `CLERK_JWT_ISSUER_DOMAIN` = `https://apparent-mastodon-43.clerk.accounts.dev`
- `OPENAI_API_KEY` = (OpenAI API key)

---

## Clerk Instances

### Production
- Publishable Key: `pk_live_Y2xlcmsua29udmVydGVkLmlvJA`
- Secret Key: `sk_live_...`
- JWT Issuer Domain: `https://clerk.konverted.io`

### Development/Staging
- Publishable Key: `pk_test_YXBwYXJlbnQtbWFzdG9kb24tNDMuY2xlcmsuYWNjb3VudHMuZGV2JA`
- Secret Key: `sk_test_...`
- JWT Issuer Domain: `https://apparent-mastodon-43.clerk.accounts.dev`

---

## Vercel Environment Variables

### Production Environment
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://hip-ptarmigan-846.convex.cloud` |
| `CONVEX_DEPLOY_KEY` | `prod:hip-ptarmigan-846\|...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |

### Preview Environment (Staging)
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://calm-canary-782.convex.cloud` |
| `CONVEX_DEPLOY_KEY` | `dev:calm-canary-782\|...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` |

---

## Deployment Commands

### Deploy to Production

```bash
# 1. Make sure you're on main branch
git checkout main

# 2. Deploy Convex to production
npx convex deploy --yes

# 3. Deploy Next.js to Vercel production
npx vercel --prod
```

### Deploy to Staging

```bash
# 1. Make sure you're on staging branch
git checkout staging

# 2. Deploy Convex to staging (uses dev deployment)
npx convex dev --once

# 3. Deploy Next.js to Vercel preview
npx vercel
```

### Quick Deploy (Current Branch)

```bash
# Deploy Convex (auto-detects environment from branch)
npx convex deploy --yes

# Deploy to Vercel production
npx vercel --prod

# Deploy to Vercel preview (staging)
npx vercel
```

---

## Git Workflow

```
main (production)     → app.konverted.io
    ↑
staging              → staging.konverted.io
    ↑
feature branches     → preview URLs (*.vercel.app)
```

### Typical Flow

1. Create feature branch from `staging`
2. Develop and test locally
3. Push to GitHub → Auto-deploys to Vercel preview
4. Merge to `staging` → Auto-deploys to staging.konverted.io
5. Test on staging
6. Merge to `main` → Auto-deploys to app.konverted.io

---

## DNS Configuration (Cloudflare)

| Type | Name | Value |
|------|------|-------|
| A | `app` | `76.76.21.21` |
| A | `staging` | `76.76.21.21` |

---

## Troubleshooting

### "No auth provider found matching the given token"
- Check `CLERK_JWT_ISSUER_DOMAIN` is set correctly in Convex Dashboard
- Production uses `https://clerk.konverted.io`
- Staging uses `https://apparent-mastodon-43.clerk.accounts.dev`

### Email extraction not working
- Check `OPENAI_API_KEY` is set in Convex Dashboard for that environment

### Clerk auth not working on custom domain
- Ensure domain is added in Clerk Dashboard under Domains
- Production Clerk instance must have `app.konverted.io` added

### Vercel environment variables
```bash
# List all env vars
npx vercel env ls

# Add new env var
echo "value" | npx vercel env add VAR_NAME production
echo "value" | npx vercel env add VAR_NAME preview

# Remove env var
npx vercel env rm VAR_NAME production --yes
```

---

## Useful Links

- Vercel Dashboard: https://vercel.com/konverted-paid/nextjs-clerk-shadcn
- Convex Dashboard: https://dashboard.convex.dev
- Clerk Dashboard: https://dashboard.clerk.com
- Domain: konverted.io (managed via Cloudflare)
