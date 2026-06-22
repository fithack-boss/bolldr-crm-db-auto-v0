"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);

    // 1. Create the account.
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data?.error ?? "Could not create your account. Please try again.");
      return;
    }

    // 2. Sign them straight in.
    const signInRes = await signIn("credentials", {
      username: email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) {
      // Account was created but auto sign-in failed — send them to login.
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white ring-1 ring-white/20">
            B
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-brand-200">Join the Bolldr sales workspace</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@bolldr.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className="input"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-200">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
