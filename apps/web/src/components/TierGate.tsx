"use client";

import type { ReactNode } from "react";

interface Props {
  allowed: boolean;
  /** Например «Pro» или «Basic» */
  requiredPlan?: string;
  children: ReactNode;
  className?: string;
}

export function TierGate({ allowed, requiredPlan, children, className = "" }: Props) {
  if (allowed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`tier-gate tier-gate--locked ${className}`}>
      {requiredPlan && (
        <p className="tier-gate-label">
          Только тариф <span className="text-gray-400">{requiredPlan}</span>
        </p>
      )}
      <fieldset disabled className="tier-gate-fieldset">
        {children}
      </fieldset>
    </div>
  );
}
