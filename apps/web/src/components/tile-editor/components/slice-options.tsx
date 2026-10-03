import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Input } from "@pigxel/ui/components/input";
import {
  PIVOTS,
  borderOf,
  centerInset,
  pivotIdOf,
  type Slice,
} from "@/lib/slices/slices";

export function SliceOptions({
  slice,
  onChange,
  onDelete,
}: {
  slice: Slice;
  onChange: (slice: Slice) => void;
  onDelete: () => void;
}) {
  const { bounds } = slice;
  const maxBorder = Math.floor((Math.min(bounds.w, bounds.h) - 1) / 2);
  const border = borderOf(slice);
  const rename = (name: string) => {
    const next = name.trim().slice(0, 100);
    if (next && next !== slice.name) onChange({ ...slice, name: next });
  };
  const setBorder = (value: number) =>
    onChange({
      ...slice,
      center: centerInset(
        bounds,
        Math.max(1, Math.min(maxBorder, Math.round(value) || 1)),
      ),
    });

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">Name</span>
        <Input
          key={slice.id + slice.name}
          inputSize="sm"
          defaultValue={slice.name}
          aria-label="Slice name"
          onBlur={(e) => rename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.currentTarget.value = slice.name;
              e.currentTarget.blur();
            }
          }}
          className="w-36"
        />
      </label>
      <span className="text-xs text-muted-foreground tabular-nums">
        {bounds.x}, {bounds.y} · {bounds.w} × {bounds.h}
      </span>

      <label
        className="flex items-center gap-2 has-disabled:opacity-50"
        title={
          maxBorder < 1
            ? "The slice is too small to have corners and a centre"
            : "Corners keep their size when a game stretches the slice; only the centre grows"
        }
      >
        <Checkbox
          checked={!!slice.center}
          disabled={maxBorder < 1}
          onChange={(e) =>
            onChange({
              ...slice,
              center: e.target.checked ? centerInset(bounds, 1) : null,
            })
          }
        />
        9-slice
      </label>
      {slice.center && (
        <label
          className="flex items-center gap-2"
          title="Corner size, in pixels"
        >
          <span className="text-muted-foreground">Border</span>
          <Input
            type="number"
            inputSize="sm"
            min={1}
            max={maxBorder}
            value={border}
            onChange={(e) => setBorder(Number(e.target.value))}
            className="w-12 px-1 text-center tabular-nums"
          />
        </label>
      )}

      <label
        className="flex items-center gap-2"
        title="The point a game places the slice by"
      >
        <span className="text-muted-foreground">Pivot</span>
        <select
          value={pivotIdOf(slice)}
          onChange={(e) => {
            const pivot = PIVOTS.find((p) => p.id === e.target.value);
            onChange({
              ...slice,
              pivot: pivot?.at?.(bounds.w, bounds.h) ?? null,
            });
          }}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {PIVOTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Delete the slice (Del)"
        onClick={onDelete}
      >
        Delete slice
      </Button>
    </div>
  );
}
