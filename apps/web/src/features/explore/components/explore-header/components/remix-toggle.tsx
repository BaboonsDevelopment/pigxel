import { Checkbox } from "@pigxel/ui/components/choice";

export function RemixToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <Checkbox
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-xs font-medium">Allow remixing</span>
        <span className="block text-[11px] text-muted-foreground">
          Others can open a copy in the editor, with credit to you.
        </span>
      </span>
    </label>
  );
}
