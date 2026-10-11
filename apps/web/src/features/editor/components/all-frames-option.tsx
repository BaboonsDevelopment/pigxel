import { Checkbox } from "@pigxel/ui/components/choice";

export function AllFramesOption({
  frameCount,
  checked,
  onChange,
}: {
  frameCount: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  if (frameCount < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Apply to all {frameCount} frames of this layer at once
    </label>
  );
}
