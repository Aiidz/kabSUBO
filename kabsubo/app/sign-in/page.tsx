"use client";

import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/app/lib/api/kabsubo-api";
import { storeUser } from "@/app/lib/auth/session";

type Mode = "signin" | "signup";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 text-[#171714]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-black/45">
            Loading sign in...
          </p>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("student@kabsubo.test");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result =
        mode === "signin"
          ? await authApi.signIn({ email, password })
          : await authApi.signUp({ name, email, password });

      storeUser(result.data);
      router.push(nextPath);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 py-8 text-[#171714]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-black text-[#1f6f53]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to map
        </Link>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[#7b3320]">
          Optional account
        </p>
        <h1 className="mt-2 text-3xl font-black">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 font-semibold leading-7 text-black/60">
          You can browse, search, and compare without an account. Sign in to
          submit places, leave reviews, save favorites, or manage your own
          submissions.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#fffaf0] p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`h-10 rounded-md text-sm font-black transition ${
              mode === "signin" ? "bg-[#171714] text-white" : "text-[#171714]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`h-10 rounded-md text-sm font-black transition ${
              mode === "signup" ? "bg-[#171714] text-white" : "text-[#171714]"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {mode === "signup" && (
            <Field label="Name" value={name} onChange={setName} />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-[#7b3320]/20 bg-[#fff4e7] px-3 py-2 text-sm font-bold text-[#7b3320]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (mode === "signup" && !name.trim())}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-4 text-sm font-black text-white transition hover:bg-[#185840] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {mode === "signin" ? (
            <LogIn size={16} aria-hidden="true" />
          ) : (
            <UserPlus size={16} aria-hidden="true" />
          )}
          {isSubmitting
            ? "Working..."
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>

        <div className="mt-4 rounded-md bg-[#fffaf0] px-3 py-2 text-sm font-semibold leading-6 text-black/62">
          Demo accounts: `student@kabsubo.test` or `admin@kabsubo.test`, both
          with password `password`.
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label>
      <span className="text-sm font-black text-black/65">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-black/10 bg-[#fffaf0] px-3 text-sm font-semibold outline-none transition focus:border-[#1f6f53]"
      />
    </label>
  );
}
