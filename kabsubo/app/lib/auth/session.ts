"use client";

import { authApi, type AuthUser } from "@/app/lib/api/kabsubo-api";

const sessionKey = "kabsubo.session.user";

export function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(sessionKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function storeUser(user: AuthUser) {
  window.localStorage.setItem(sessionKey, JSON.stringify(user));
  window.dispatchEvent(new Event("kabsubo-auth-change"));
}

export async function clearStoredUser() {
  window.localStorage.removeItem(sessionKey);
  window.dispatchEvent(new Event("kabsubo-auth-change"));
  await authApi.signOut();
}
