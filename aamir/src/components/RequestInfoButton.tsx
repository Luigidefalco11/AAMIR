"use client";

import { useState } from "react";
import { buildRequestInfoMessage, instagramDmUrl } from "@/lib/contact";
import type { Locale } from "@/sanity/localize";

export function RequestInfoButton({
  instagramHandle,
  productName,
  locale,
  label,
  copiedLabel,
}: {
  instagramHandle: string;
  productName: string;
  locale: Locale;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const message = buildRequestInfoMessage({ productName, locale });
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the DM
      // thread still opens so the user can type the message manually.
    }
    window.open(instagramDmUrl(instagramHandle), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
      >
        {label}
      </button>
      {copied && (
        <span role="status" className="text-xs text-[color:var(--color-text)]/70">
          {copiedLabel}
        </span>
      )}
    </div>
  );
}
