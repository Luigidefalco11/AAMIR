import Link from "next/link";
import { CATEGORY_SLUGS } from "@/lib/categories";

export function CategoryFilter({
  locale,
  active,
  labels,
}: {
  locale: string;
  active: string | null;
  labels: Record<string, string>;
}) {
  const base = `/${locale}/collezioni`;
  const linkCls = (isActive: boolean) =>
    `text-sm tracking-wide pb-1 border-b-2 transition-colors ${
      isActive
        ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
        : "border-transparent text-[color:var(--color-text)]/60 hover:text-[color:var(--color-primary)]"
    }`;

  return (
    <div className="flex flex-wrap gap-6 mb-12">
      <Link href={base} className={linkCls(active === null)}>{labels.all}</Link>
      {CATEGORY_SLUGS.map((slug) => (
        <Link key={slug} href={`${base}/${slug}`} className={linkCls(active === slug)}>
          {labels[slug]}
        </Link>
      ))}
    </div>
  );
}
