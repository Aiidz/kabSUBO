"use client";

import {
  ChevronDown,
  FileClock,
  Heart,
  LogIn,
  LogOut,
  Plus,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/app/lib/api/kabsubo-api";
import { clearStoredUser, getStoredUser } from "@/app/lib/auth/session";

export function AccountMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function refreshUser() {
      setUser(getStoredUser());
      setIsOpen(false);
    }

    refreshUser();
    window.addEventListener("kabsubo-auth-change", refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      window.removeEventListener("kabsubo-auth-change", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!user) {
    return (
      <div ref={menuRef} className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="grid size-14 place-items-center rounded-full bg-[#004b35] text-[#fffaf0] shadow-2xl ring-2 ring-[#fffaf0]/70 transition hover:scale-105 sm:size-16"
          aria-label="Open account menu"
          aria-expanded={isOpen}
        >
          <UserRound size={24} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-lg border border-[#004b35]/12 bg-[#fffaf0] text-[#004b35] shadow-2xl">
            <div className="border-b border-[#004b35]/10 px-4 py-3">
              <p className="text-sm font-black">Guest account</p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.14em] text-[#004b35]/55">
                Sign in to save
              </p>
            </div>
            <nav className="p-2" aria-label="Account">
              <AccountMenuLink href="/auth" icon={<LogIn size={16} />}>
                Sign in / Sign up
              </AccountMenuLink>
              <AccountMenuLink href="/favorites" icon={<Heart size={16} />}>
                Favorites
              </AccountMenuLink>
              <AccountMenuLink
                href="/my/submissions"
                icon={<FileClock size={16} />}
              >
                My submissions
              </AccountMenuLink>
              <AccountMenuLink href="/submit" icon={<Plus size={16} />}>
                Add a place
              </AccountMenuLink>
            </nav>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={menuRef} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="grid size-14 place-items-center rounded-full bg-[#004b35] text-[#fffaf0] shadow-2xl ring-2 ring-[#fffaf0]/70 transition hover:scale-105 sm:size-16"
        aria-label="Open account menu"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-black leading-none">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-lg border border-[#004b35]/12 bg-[#fffaf0] text-[#004b35] shadow-2xl">
          <div className="border-b border-[#004b35]/10 px-4 py-3">
            <p className="text-sm font-black">{user.name}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.14em] text-[#004b35]/55">
              {user.role}
            </p>
          </div>
          <nav className="p-2" aria-label="Account">
            <AccountMenuLink href="/favorites" icon={<Heart size={16} />}>
              Favorites
            </AccountMenuLink>
            <AccountMenuLink
              href="/my/submissions"
              icon={<FileClock size={16} />}
            >
              My submissions
            </AccountMenuLink>
            <AccountMenuLink href="/submit" icon={<Plus size={16} />}>
              Add a place
            </AccountMenuLink>
            <AccountMenuLink href="/auth" icon={<UserRound size={16} />}>
              Account
            </AccountMenuLink>
            {user.role === "admin" && (
              <AccountMenuLink href="/admin" icon={<Shield size={16} />}>
                Admin moderation
              </AccountMenuLink>
            )}
            <button
              type="button"
              onClick={() => {
                clearStoredUser();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-bold transition hover:bg-[#004b35]/8"
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

function AccountMenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-bold transition hover:bg-[#004b35]/8"
    >
      <span className="flex items-center gap-3">
        {icon}
        {children}
      </span>
      <ChevronDown
        size={14}
        className="-rotate-90 opacity-45"
        aria-hidden="true"
      />
    </Link>
  );
}
