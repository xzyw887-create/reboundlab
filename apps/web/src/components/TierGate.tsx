"use client";

import { type ReactNode } from "react";
import { formatTpl, useLocale } from "@/lib/i18n";

interface Props {
  allowed: boolean;
  /** Shown only when the feature is locked (plan upgrade) */
  title: string;
  requiredPlan?: string;
  children: ReactNode;
  className?: string;
}

export function TierGate({
  allowed,
  title,
  requiredPlan,
  children,
  className = "",
}: Props) {
  const { t } = useLocale();

  if (!allowed) {
    return (
      <div className={`tier-gate tier-gate--locked ${className}`}>
        <div className="tier-gate-header tier-gate-header--locked">
          <span className="tier-gate-title">{title}</span>
          {requiredPlan && (
            <span className="tier-gate-plan">
              {formatTpl(t.tierGate.requiresPlan, { plan: requiredPlan })}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`tier-gate tier-gate--allowed ${className}`}>
      <div className="tier-gate-body tier-gate-body--open">{children}</div>
    </div>
  );
}
