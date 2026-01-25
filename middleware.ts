import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protected routes require authentication
const isProtectedRoute = createRouteMatcher([
  "/tasks(.*)",
  "/today(.*)",
  "/review(.*)",
  "/clients(.*)",
]);

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Redirect authenticated users from root to /tasks
  const { userId } = await auth();
  if (userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/tasks", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
