"use client";

import {
  FileClock,
  Heart,
  LogIn,
  LogOut,
  Shield,
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
        className="pointer-events-auto grid size-12 place-items-center rounded-full bg-[#004b35] text-[#fffaf0] shadow-2xl ring-2 ring-[#fffaf0]/70 transition hover:scale-105 sm:size-14"
        aria-label="Sign in"
      >
        <LogIn size={20} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#fffaf0]/88 p-1.5 shadow-2xl ring-1 ring-[#004b35]/12 backdrop-blur-xl">
      {user.role === "admin" && (
        <Link
          href="/admin"
          className="grid size-9 place-items-center rounded-full text-[#004b35] transition hover:bg-[#004b35]/10"
          aria-label="Open admin moderation"
        >
          <Shield size={16} aria-hidden="true" />
        </Link>
      )}
      <Link
        href="/my/submissions"
        className="grid size-9 place-items-center rounded-full text-[#004b35] transition hover:bg-[#004b35]/10"
        aria-label="Open my submissions"
      >
        <FileClock size={16} aria-hidden="true" />
      </Link>
      <Link
        href="/favorites"
        className="grid size-9 place-items-center rounded-full text-[#004b35] transition hover:bg-[#004b35]/10"
        aria-label="Open favorites"
      >
        <Heart size={16} aria-hidden="true" />
      </Link>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#004b35] text-sm font-black text-[#fffaf0]">
        {user.name.charAt(0).toUpperCase()}
        <span className="sr-only">{user.name}</span>
      </span>
      <button
        type="button"
        onClick={() => void clearStoredUser()}
        className="grid size-9 place-items-center rounded-full text-[#004b35] transition hover:bg-[#004b35]/10"
        aria-label="Sign out"
      >
        <LogOut size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
