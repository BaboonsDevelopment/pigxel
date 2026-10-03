import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

const fieldClassName =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

export function Input({
  className,
  inputSize = "md",
  ...props
}: ComponentProps<"input"> & { inputSize?: "sm" | "md" | "lg" }) {
  return (
    <input
      data-slot="input"
      className={cn(
        fieldClassName,
        { sm: "h-8", md: "h-10", lg: "h-11" }[inputSize],
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClassName, "resize-none py-2", className)}
      {...props}
    />
  );
}

export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "flex h-10 w-full min-w-0 items-center rounded-lg border border-input bg-background text-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupText({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn("shrink-0 px-3 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function InputGroupInput({
  className,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-full w-full min-w-0 bg-transparent px-3 outline-none placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type SelectSize = "xs" | "sm" | "md";

const selectSizes: Record<SelectSize, string> = {
  xs: "h-7 rounded-md px-1.5 text-xs",
  sm: "h-8 rounded-md px-2",
  md: "h-10 px-3",
};

export function Select({
  className,
  selectSize = "sm",
  ...props
}: ComponentProps<"select"> & { selectSize?: SelectSize }) {
  return (
    <select
      data-slot="select"
      className={cn(
        fieldClassName,
        "w-auto cursor-pointer",
        selectSizes[selectSize],
        className,
      )}
      {...props}
    />
  );
}
