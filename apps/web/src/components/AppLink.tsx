"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { fullAppUrl } from "@/lib/appOrigin";

const APP_HOST_PATHS = ["/app", "/register", "/login", "/account"];

function resolveHref(href: string): string {
  const base = process.env.NEXT_PUBLIC_FULL_APP_URL;
  if (!base) return href;
  if (APP_HOST_PATHS.some((p) => href === p || href.startsWith(`${p}/`))) {
    return fullAppUrl(href);
  }
  return href;
}

type Props = ComponentProps<typeof Link>;

/** Link to app/auth on Render when NEXT_PUBLIC_FULL_APP_URL is set. */
export function AppLink({ href, ...rest }: Props) {
  const raw = typeof href === "string" ? href : "";
  const resolved = resolveHref(raw);
  if (resolved.startsWith("http")) {
    return <a href={resolved} {...(rest as ComponentProps<"a">)} />;
  }
  return <Link href={href} {...rest} />;
}
