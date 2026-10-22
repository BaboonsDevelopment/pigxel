import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import type { CoverageMetric, CoverageReport } from "../../../types";
import { formatWhen } from "../helpers";

const METRICS: { id: CoverageMetric; label: string }[] = [
  { id: "lines", label: "Lines" },
  { id: "statements", label: "Statements" },
  { id: "functions", label: "Functions" },
  { id: "branches", label: "Branches" },
];

export function CoveragePanel({ coverage }: { coverage: CoverageReport }) {
  return (
    <section aria-labelledby="coverage-title" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <Heading as="h2" size="section" id="coverage-title">
          Coverage
        </Heading>
        <span className="text-xs text-muted-foreground">
          Report from {formatWhen(coverage.at)}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {METRICS.map(({ id, label }) => {
          const metric = coverage.totals[id];
          const below =
            metric.threshold !== null && metric.pct < metric.threshold;
          return (
            <li key={id} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "mt-1 font-mono text-2xl tabular-nums",
                  below && "text-destructive",
                )}
              >
                {metric.pct.toFixed(1)}%
              </p>
              <div
                aria-hidden="true"
                className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    below ? "bg-destructive" : "bg-success",
                  )}
                  style={{ width: `${Math.min(metric.pct, 100)}%` }}
                />
                {metric.threshold !== null && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/60"
                    style={{ left: `${metric.threshold}%` }}
                  />
                )}
              </div>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground tabular-nums">
                {metric.covered}/{metric.total}
                {metric.threshold !== null &&
                  ` · floor ${metric.threshold}%${below ? " — below" : ""}`}
              </p>
            </li>
          );
        })}
      </ul>
      {coverage.lowest.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-xs">
            <caption className="px-4 pt-3 text-left text-xs font-medium">
              Least-covered files (by lines)
            </caption>
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-normal">File</th>
                <th className="px-4 py-2 text-right font-normal">Lines</th>
                <th className="px-4 py-2 text-right font-normal">Covered</th>
              </tr>
            </thead>
            <tbody>
              {coverage.lowest.map((file) => (
                <tr key={file.file} className="border-t">
                  <td className="px-4 py-2 font-mono break-all">{file.file}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {file.covered}/{file.total}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {file.pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
