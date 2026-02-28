"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/authClient";
import { Button, Card, CardContent, CardHeader, Input } from "../../components/ui";
import { useToast } from "../../components/toast";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, login, logout, isLoading } = useAuth();
  const { push } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // If user hits /login?signout=1, clear session (handy during dev)
  React.useEffect(() => {
    const signout = params?.get("signout");
    if (signout === "1") {
      logout();
      push({ tone: "info", title: "Signed out", message: "You can sign in again." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      push({ tone: "success", title: "Welcome to Nuvo", message: "Signed in (demo)." });
      router.replace("/app/overview");
    } catch (err: any) {
      push({ tone: "error", title: "Login failed", message: err?.message ?? "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-ink-700">Loading…</div>;
  }

  // IMPORTANT: Do NOT auto-redirect if already signed in.
  // Show a stable "Continue" screen to avoid flashing loops and to make it obvious what's happening.
  if (user) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <img src="/assets/nuvotypeorange.svg" alt="Nuvo" className="h-7" />
              </div>
              <div className="mt-2 text-sm text-ink-600">
                You’re signed in as <span className="font-medium">{user.email}</span>.
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => router.replace("/app/overview")}>
                Continue to dashboard
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  logout();
                  push({ tone: "info", title: "Signed out", message: "Signed out successfully." });
                }}
              >
                Sign out
              </Button>
              <div className="text-xs text-ink-600">
                Tip: to force sign out from the URL, go to <span className="font-mono">/login?signout=1</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <img src="/assets/nuvotypeorange.svg" alt="Nuvo" className="h-7" />
            </div>
            <div className="mt-2 text-sm text-ink-600">Sign in to the Nuvo portal (demo accounts).</div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="mt-1">
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Password</div>
                <div className="mt-1">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="DemoPass!123"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button className="w-full" disabled={loading || !email || !password}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              <div className="rounded-xl2 border border-ink-200 bg-ink-50 p-3 text-sm text-ink-700">
                <div className="font-semibold">Demo logins</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="font-medium">Summit Admin</span>: admin@summitspeech.demo</div>
                  <div><span className="font-medium">Summit SLP</span>: sofia@summitspeech.demo</div>
                  <div><span className="font-medium">Blue Sky Admin</span>: admin@bluesky.demo</div>
                  <div><span className="font-medium">Blue Sky SLP</span>: mia@bluesky.demo</div>
                </div>
                <div className="mt-2"><span className="font-medium">Password</span>: DemoPass!123</div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
