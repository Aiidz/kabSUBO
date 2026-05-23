import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/app/components/account/account-menu";

export function AppNavbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
      <Link
        href="/"
        className="pointer-events-auto grid size-16 place-items-center rounded-lg transition hover:scale-[1.03] sm:size-20"
        aria-label="kabSUBO home"
      >
        <Image
          src="/brand/kabsubo-logo.png"
          alt="kabSUBO logo"
          width={160}
          height={160}
          priority
          className="size-14 object-contain sm:size-16"
        />
      </Link>

      <AccountMenu />
    </header>
  );
}
