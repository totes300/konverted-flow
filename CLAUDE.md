# Claude Code Guidelines - Konverted Flow

## ABSOLUTE RULE: NO CUSTOM CODE - shadcn ONLY

### BEFORE writing ANY UI code, you MUST:
1. **Check https://ui.shadcn.com/blocks** for a ready-to-use block
2. **Check https://ui.shadcn.com/docs/components** for ready-to-use components
3. **Install** the block/component: `npx shadcn@latest add <name>`
4. **Copy the exact patterns** from the installed code - DO NOT modify structure

### FORBIDDEN:
- Creating custom components
- Custom styling beyond what shadcn provides
- Custom layouts - use shadcn blocks
- Custom tables - use shadcn data-table block
- Custom forms - use shadcn form patterns
- Custom cards - use shadcn Card exactly as documented
- Inventing new patterns

### REQUIRED:
- Use **dashboard-01** block as the base: `npx shadcn@latest add dashboard-01`
- Use `@tabler/icons-react` for ALL icons
- Copy code directly from shadcn examples
- If a feature needs UI, find the shadcn block/component first

### Reference Links:
- Blocks: https://ui.shadcn.com/blocks
- Components: https://ui.shadcn.com/docs/components
- Dashboard-01: https://ui.shadcn.com/blocks/dashboard-01

### Available shadcn Blocks (use these!):
- `dashboard-01` through `dashboard-07` - Dashboard layouts
- `login-01` through `login-05` - Auth pages
- `sidebar-01` through `sidebar-15` - Sidebar variants
- `chart-*` - Various chart blocks
- `calendar-*` - Calendar blocks
- `data-table` - Full-featured data tables
- `authentication-*` - Auth forms
- Check https://ui.shadcn.com/blocks for the full list

## Project Overview
Task management and time tracking application built with Next.js, Convex, Clerk, and shadcn/ui.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Convex
- **Auth**: Clerk
- **UI**: shadcn/ui + Tailwind CSS v4
- **Icons**: @tabler/icons-react
- **Forms**: React Hook Form + Zod

---

## Dashboard-01 Layout Pattern

### Root Layout Structure
```tsx
<SidebarProvider
  style={{
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties}
>
  <AppSidebar variant="inset" />
  <SidebarInset>
    <SiteHeader />
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {children}
        </div>
      </div>
    </div>
  </SidebarInset>
</SidebarProvider>
```

### Site Header (dashboard-01 style)
```tsx
<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
  <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
    <h1 className="text-base font-medium">{pageName}</h1>
  </div>
</header>
```

### App Sidebar (dashboard-01 style)
```tsx
<Sidebar collapsible="offcanvas" {...props}>
  <SidebarHeader>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
          <a href="/tasks">
            <IconInnerShadowTop className="!size-5" />
            <span className="text-base font-semibold">App Name</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarHeader>
  <SidebarContent>
    <NavMain items={navItems} />
  </SidebarContent>
  <SidebarFooter>
    <NavUser />
  </SidebarFooter>
</Sidebar>
```

### Page Content Pattern
Every page uses `px-4 lg:px-6` padding:
```tsx
export default function PageName() {
  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Page Title</h1>
          <p className="text-sm text-muted-foreground">Page description.</p>
        </div>
        <Button>Action</Button>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent>
            {/* Content here */}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

### Section Cards (dashboard-01 stats)
```tsx
<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
  <Card className="@container/card">
    <CardHeader>
      <CardDescription>Metric Name</CardDescription>
      <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
        Value
      </CardTitle>
      <CardAction>
        <Badge variant="outline">
          <IconTrendingUp />
          +12.5%
        </Badge>
      </CardAction>
    </CardHeader>
    <CardFooter className="flex-col items-start gap-1.5 text-sm">
      <div className="line-clamp-1 flex gap-2 font-medium">
        Trend description <IconTrendingUp className="size-4" />
      </div>
      <div className="text-muted-foreground">Additional context</div>
    </CardFooter>
  </Card>
</div>
```

### Empty States
```tsx
<Card>
  <CardContent className="flex flex-col items-center justify-center py-16">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <IconName className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="mt-4 text-lg font-semibold">No items yet</h3>
    <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
      Description of what to do.
    </p>
    <Button className="mt-6">
      <IconPlus className="mr-2 h-4 w-4" />
      Add Item
    </Button>
  </CardContent>
</Card>
```

### Tables
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Column</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Data</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

---

## MANDATORY Checklist - Run Before ANY UI Work

### Step 1: Find the shadcn solution
- [ ] Searched https://ui.shadcn.com/blocks for a matching block?
- [ ] Searched https://ui.shadcn.com/docs/components for components?
- [ ] Installed required block/component with `npx shadcn@latest add <name>`?

### Step 2: Copy, don't create
- [ ] Copied code directly from shadcn examples?
- [ ] Using exact class names from shadcn?
- [ ] NOT inventing custom styles or layouts?

### Step 3: Verify compliance
- [ ] Uses `@tabler/icons-react` (NOT lucide)?
- [ ] Follows dashboard-01 patterns exactly?
- [ ] Page uses `px-4 lg:px-6` padding?
- [ ] Card/Table/Form components are from shadcn?

### If you can't find a shadcn solution:
**ASK THE USER** before writing any custom code. Never assume custom code is acceptable.

---

## File Structure
```
app/
  (dashboard)/
    layout.tsx        # SidebarProvider + AppSidebar + SiteHeader
    tasks/page.tsx
    today/page.tsx
    clients/page.tsx
    review/page.tsx
  dashboard/          # Reference dashboard-01 block (from shadcn)
    page.tsx
    data.json
components/
  layout/
    app-sidebar.tsx   # Sidebar with NavMain + NavUser
    nav-main.tsx      # Navigation items
    nav-user.tsx      # User menu (Clerk integration)
    site-header.tsx   # Page header with SidebarTrigger
  ui/                 # shadcn components
  clients/            # Feature components
  # Dashboard-01 block components (from shadcn)
  app-sidebar.tsx
  chart-area-interactive.tsx
  data-table.tsx
  nav-documents.tsx
  nav-main.tsx
  nav-secondary.tsx
  nav-user.tsx
  section-cards.tsx
  site-header.tsx
convex/
  schema.ts
  lib/auth.ts
  clients.ts
  users.ts
  tasks.ts
```

---

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test:run` - Run tests
- `npx convex dev --once` - Deploy Convex functions

### shadcn Commands
- `npx shadcn@latest add <component>` - Add a UI component
- `npx shadcn@latest add <block>` - Add a block
- `npx shadcn@latest add dashboard-01` - Dashboard-01 block (our style)
- Reference: https://ui.shadcn.com/blocks
