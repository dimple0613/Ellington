import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Inventory() {
  const router = useRouter();
  useEffect(() => {
    const q: Record<string, string> = { s: "inventory" };
    if (typeof router.query.scope === "string") q.scope = router.query.scope;
    router.replace({ pathname: "/project", query: q });
  }, [router]);
  return null;
}