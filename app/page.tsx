"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton, SignInButton, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </>
  );
}

function AuthenticatedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/tasks");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to tasks...</p>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background p-4 flex justify-between items-center">
        <span className="font-semibold text-lg">Konverted Flow</span>
        <div className="flex gap-2">
          <SignInButton mode="modal">
            <Button variant="outline">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Get started</Button>
          </SignUpButton>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-4xl font-bold text-center">
          Task Management & Time Tracking
        </h1>
        <p className="text-xl text-muted-foreground text-center max-w-md">
          A powerful task management system with time tracking, client management, and team collaboration.
        </p>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="lg">Get started free</Button>
          </SignUpButton>
        </div>
      </main>
    </div>
  );
}
