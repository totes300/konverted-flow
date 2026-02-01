# Deployment Guide - Konverted Flow

## Quick Reference

| Environment | URL | Branch | Convex |
|-------------|-----|--------|--------|
| **Local** | http://localhost:3000 | any | `calm-canary-782` (dev) |
| **Production** | https://app.konverted.io | `main` | `hip-ptarmigan-846` (prod) |
| **Staging** | https://staging.konverted.io | `staging` | `calm-canary-782` (dev) |

---

## Daily Workflow (Solo Dev)

### 1. Develop Locally

```bash
# Start local dev server (uses Convex dev + Clerk dev)
npm run dev
```

Test everything locally. Your local environment uses:
- Convex dev deployment (`calm-canary-782`)
- Clerk dev instance (`pk_test_*`)

### 2. Ship It

```bash
# When it works, commit and push to main
git add .
git commit -m "feat: your change"
git push origin main
```

**That's it.** Pushing to `main`:
- Auto-deploys Next.js to Vercel (app.konverted.io)
- You need to manually deploy Convex if you changed backend code:

```bash
npx convex deploy --yes
```

---

## When to Use Staging

Only for **risky changes** you want to test before going live:

```bash
# Create feature branch
git checkout -b feature/risky-thing

# Develop...
git push origin feature/risky-thing

# This creates a preview URL at Vercel
# Test it, then merge to main when confident
```

---

## Manual Deploy Commands

### Deploy Convex to Production
```bash
npx convex deploy --yes
```

### Deploy Next.js to Production
```bash
npx vercel --prod
```

### Deploy to Staging/Preview
```bash
npx vercel
```

---

## Rollback

If you break production:

1. **Vercel**: Go to https://vercel.com/konverted-paid/nextjs-clerk-shadcn/deployments → Click previous deployment → "Promote to Production"

2. **Git**:
```bash
git revert HEAD
git push origin main
```

---

## Architecture Details

### Convex Deployments

| Environment | Deployment | URL |
|-------------|------------|-----|
| Production | `hip-ptarmigan-846` | https://hip-ptarmigan-846.convex.cloud |
| Development | `calm-canary-782` | https://calm-canary-782.convex.cloud |

### Convex Environment Variables

**Production (`hip-ptarmigan-846`):**
- `CLERK_JWT_ISSUER_DOMAIN` = `https://clerk.konverted.io`
- `OPENAI_API_KEY` = (your key)

**Development (`calm-canary-782`):**
- `CLERK_JWT_ISSUER_DOMAIN` = `https://apparent-mastodon-43.clerk.accounts.dev`
- `OPENAI_API_KEY` = (your key)

### Clerk Instances

| Environment | Publishable Key | JWT Issuer |
|-------------|-----------------|------------|
| Production | `pk_live_Y2xlcmsua29udmVydGVkLmlvJA` | `https://clerk.konverted.io` |
| Development | `pk_test_YXBwYXJlbnQtbWFzdG9kb24tNDMuY2xlcmsuYWNjb3VudHMuZGV2JA` | `https://apparent-mastodon-43.clerk.accounts.dev` |

### Vercel Environment Variables

**Production:**
- `NEXT_PUBLIC_CONVEX_URL` = `https://hip-ptarmigan-846.convex.cloud`
- `CONVEX_DEPLOY_KEY` = `prod:hip-ptarmigan-846|...`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_...`
- `CLERK_SECRET_KEY` = `sk_live_...`

**Preview:**
- `NEXT_PUBLIC_CONVEX_URL` = `https://calm-canary-782.convex.cloud`
- `CONVEX_DEPLOY_KEY` = `dev:calm-canary-782|...`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_test_...`
- `CLERK_SECRET_KEY` = `sk_test_...`

---

## Troubleshooting

### "No auth provider found matching the given token"
Check `CLERK_JWT_ISSUER_DOMAIN` in Convex Dashboard matches the Clerk instance.

### Email extraction not working
Check `OPENAI_API_KEY` is set in Convex Dashboard.

### Clerk auth not working
Ensure your domain is added in Clerk Dashboard → Domains.

### Manage Vercel env vars
```bash
npx vercel env ls                              # List all
echo "value" | npx vercel env add VAR production  # Add
npx vercel env rm VAR production --yes         # Remove
```

---

## Links

- **Vercel**: https://vercel.com/konverted-paid/nextjs-clerk-shadcn
- **Convex**: https://dashboard.convex.dev
- **Clerk**: https://dashboard.clerk.com
