import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) q.append(key, v);
    }
  }
  const qs = q.toString();
  redirect(qs ? `/login?${qs}` : "/login");
}
