"use client";

import { Lock } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/app/lib/api/kabsubo-api";
import { storeUser } from "@/app/lib/auth/session";

type Mode = "signin" | "signup";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#fffaf0] px-5 text-[#073d33]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#073d33]/55">
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password || (mode === "signup" && !confirmPassword)) {
      setError("Complete all fields.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "signin"
          ? await authApi.signIn({ email, password })
          : await authApi.signUp({
              name: getNameFromEmail(email),
              email,
              password,
            });

      storeUser(result.data);
      router.push(nextPath);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to continue right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fffaf0] px-5 py-24 text-[#073d33]">
      <AuthWave />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[430px] rounded-[22px] border-2 border-[#004b35] bg-[#fffaf0]/96 px-7 py-7 shadow-[0_12px_18px_rgba(0,75,53,0.22)] sm:px-8"
      >
        <h1 className="text-center text-4xl font-black tracking-normal">
          {mode === "signin" ? "Log In" : "Sign Up"}
        </h1>

        <div className="mt-7 space-y-3">
          <AuthField
            label="Email"
            type="email"
            value={email}
            placeholder="someone@cvsu.edu.ph"
            onChange={setEmail}
          />

          <AuthField
            label={mode === "signin" ? "Password" : "New Password"}
            type="password"
            value={password}
            placeholder={
              mode === "signin" ? "Enter password" : "Enter new password"
            }
            onChange={setPassword}
            hasLock
          />

          {mode === "signup" && (
            <AuthField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              placeholder="Confirm new password"
              onChange={setConfirmPassword}
              hasLock
            />
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-[#004b35]/20 bg-[#f6efda] px-3 py-2 text-sm font-bold text-[#073d33]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mx-auto mt-6 flex h-10 w-full max-w-60 items-center justify-center rounded-full bg-[#004b35] text-lg font-black text-[#fffaf0] shadow-sm transition hover:bg-[#073d33] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Working..."
            : mode === "signin"
              ? "Log In"
              : "Sign Up"}
        </button>

        <p className="mt-2 text-center text-base font-semibold text-[#073d33]/78">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirmPassword("");
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="font-bold text-[#004b35] underline-offset-2 hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Log in"}
          </button>
        </p>
      </form>
    </main>
  );
}

function AuthField({
  hasLock = false,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  hasLock?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xl font-black leading-none text-[#073d33]">
        {label}
      </span>
      <span className="mt-1.5 flex h-10 items-center rounded-md border border-[#004b35] bg-[#f8f5e9] px-3">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[#073d33] outline-none placeholder:text-[#073d33]/68"
        />
        {hasLock && (
          <Lock size={18} className="shrink-0 text-[#073d33]/62" aria-hidden="true" />
        )}
      </span>
    </label>
  );
}

function AuthWave() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] w-full text-[#004b35]"
      preserveAspectRatio="none"
      viewBox="0 0 1440 390"
    >
      <path
        fill="currentColor"
        d="M0 145C170 10 388 58 610 114C826 169 1056 246 1252 205C1354 184 1410 131 1440 93V390H0V145Z"
      />
    </svg>
  );
}

function getNameFromEmail(email: string) {
  const localPart = email.trim().split("@")[0] || "kabSUBO user";

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
