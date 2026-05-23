"use client";

import {
  FileClock,
  Heart,
  LogIn,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/app/lib/api/kabsubo-api";
import { clearStoredUser, getStoredUser } from "@/app/lib/auth/session";

export function AccountMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    function refreshUser() {
      setUser(getStoredUser());
    }

    refreshUser();
    window.addEventListener("kabsubo-auth-change", refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      window.removeEventListener("kabsubo-auth-change", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  if (!user) {
    return (
      <Link
        href="/auth"
        className="pointer-events-auto absolute right-3 top-16 z-30 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/55 bg-white/84 px-4 text-sm font-black text-[#171714] shadow-2xl backdrop-blur-xl transition hover:border-[#1f6f53] sm:right-6 sm:top-20"
      >
        <LogIn size={17} aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-16 z-30 flex max-w-[260px] items-center gap-2 rounded-lg border border-white/55 bg-white/86 p-2 shadow-2xl backdrop-blur-xl sm:right-6 sm:top-20">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#1f6f53] text-white">
        <UserRound size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{user.name}</p>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">
          {user.role}
        </p>
      </div>
      {user.role === "admin" && (
        <Link
          href="/admin"
          className="grid size-9 place-items-center rounded-md border border-black/10 bg-white text-[#7b3320] transition hover:border-[#1f6f53]"
          aria-label="Open admin moderation"
        >
          <Shield size={16} aria-hidden="true" />
        </Link>
      )}
      <Link
        href="/my/submissions"
        className="grid size-9 place-items-center rounded-md border border-black/10 bg-white text-[#171714] transition hover:border-[#1f6f53]"
        aria-label="Open my submissions"
      >
        <FileClock size={16} aria-hidden="true" />
      </Link>
      <Link
        href="/favorites"
        className="grid size-9 place-items-center rounded-md border border-black/10 bg-white text-[#7b3320] transition hover:border-[#1f6f53]"
        aria-label="Open favorites"
      >
        <Heart size={16} aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => void clearStoredUser()}
        className="grid size-9 place-items-center rounded-md border border-black/10 bg-white text-[#171714] transition hover:border-[#7b3320]"
        aria-label="Sign out"
      >
        <LogOut size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
