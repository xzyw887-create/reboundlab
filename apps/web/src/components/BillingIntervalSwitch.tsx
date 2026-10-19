"use client";

import type { BillingInterval } from "@/lib/billingInterval";

interface Props {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}

export function BillingIntervalSwitch({ value, onChange }: Props) {
  const isYear = value === "year";

  return (
    <div className="flex justify-center mb-5">
      <div className="billing-interval-switch" role="tablist" aria-label="Период оплаты">
        <div
          className={`billing-interval-switch-slider ${isYear ? "billing-interval-switch-slider--year" : ""}`}
          aria-hidden
        />
        <button
          type="button"
          role="tab"
          aria-selected={!isYear}
          className={`billing-interval-switch-option ${!isYear ? "billing-interval-switch-option--active" : ""}`}
          onClick={() => onChange("month")}
        >
          Месяц
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isYear}
          className={`billing-interval-switch-option ${isYear ? "billing-interval-switch-option--active" : ""}`}
          onClick={() => onChange("year")}
        >
          Год −30%
        </button>
      </div>
    </div>
  );
}
