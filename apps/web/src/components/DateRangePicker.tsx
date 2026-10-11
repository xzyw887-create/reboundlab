"use client";

import type { DateCoverage } from "@/lib/dateCoverage";
import { useLocale } from "@/lib/i18n";
import { DatePickerField } from "@/components/DatePickerField";

interface Props {
  startDate: string;
  endDate: string;
  coverage: DateCoverage | null;
  loading?: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  coverage,
  loading = false,
  onStartChange,
  onEndChange,
}: Props) {
  const { t } = useLocale();

  if (loading) {
    return (
      <p className="text-xs text-accent rounded-lg border border-border/50 bg-panel-inner/40 p-2.5">
        {t.dates.loading}
      </p>
    );
  }

  if (!coverage) {
    return (
      <p className="text-xs text-gold/90 rounded-lg border border-gold/30 bg-gold/5 p-2.5">
        {t.dates.noDataInPlan}
      </p>
    );
  }

  const endMin = startDate < coverage.from ? coverage.from : startDate;

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      <DatePickerField
        value={startDate}
        min={coverage.from}
        max={coverage.to}
        ariaLabel={t.dates.start}
        onChange={onStartChange}
      />
      <DatePickerField
        value={endDate}
        min={endMin}
        max={coverage.to}
        ariaLabel={t.dates.end}
        align="end"
        onChange={onEndChange}
      />
    </div>
  );
}
