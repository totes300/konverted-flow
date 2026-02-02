# Git Workflow - Solo Dev

## Daily Workflow

```bash
# 1. Start your day
git pull origin main

# 2. Build something
npm run dev

# 3. Commit when it works
git add .
git commit -m "feat: what you built"

# 4. Push to deploy
git push origin main          # Vercel auto-deploys
npx convex deploy --yes       # If you changed convex/ files
```

---

## Commit Messages

```
feat: add user authentication
fix: broken login button
update: improve task loading speed
wip: work in progress (uncommitted safe point)
```

---

## When Something Breaks

```bash
# Undo last commit (keep files)
git reset --soft HEAD~1

# Fully revert to last commit (discard changes)
git reset --hard HEAD~1

# Revert but keep history (safest)
git revert HEAD
```

---

## Golden Rules

1. **Commit before leaving your desk** - even if it's WIP
2. **Commit before experimenting** - so you can go back
3. **Push at least once a day** - code in the cloud is safe
4. **Never deploy uncommitted code** - always commit first

---

## When to Use Branches

| Situation | Use Branch? |
|-----------|-------------|
| Normal daily work | No, commit to main |
| Risky experiment | Yes |
| Urgent fix while mid-work | Yes |
| Client preview before launch | Yes |

### Risky Experiment

```bash
git checkout -b experiment/new-auth-system

# Try things, break things...

# If it works:
git checkout main
git merge experiment/new-auth-system
git push origin main

# If it fails:
git checkout main
git branch -D experiment/new-auth-system
```

### Urgent Fix While Mid-Feature

```bash
# Save current work
git add .
git commit -m "wip: feature in progress"

# Fix bug on main
git checkout main
# fix the bug...
git add .
git commit -m "fix: critical bug"
git push origin main

# Go back to feature
git checkout feature-branch
git merge main
```

### Preview Deployment

```bash
git checkout -b preview/new-feature
git push origin preview/new-feature
# Vercel creates preview URL automatically

# When approved:
git checkout main
git merge preview/new-feature
git push origin main
```

---

## Branch Naming

```
feature/add-login        # New features
fix/broken-button        # Bug fixes
experiment/try-new-db    # Experiments
preview/client-review    # Client previews
```

---

## Quick Reference

```bash
# Check status
git status

# See what changed
git diff

# See commit history
git log --oneline -10

# Discard all local changes (DANGEROUS)
git reset --hard origin/main
git clean -fd
```
