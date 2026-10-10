import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogHeader } from "../src/components/dialog";

function open(props: Partial<Parameters<typeof Dialog>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <Dialog onClose={onClose} {...props}>
      <DialogHeader title="Rename tile" description="Pick a short name." />
      <p>Body</p>
    </Dialog>,
  );
  return {
    onClose,
    user: userEvent.setup(),
    dialog: screen.getByRole("dialog"),
  };
}

describe("Dialog", () => {
  it("opens as a modal named by its title", () => {
    const { dialog } = open();
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName("Rename tile");
  });

  it("closes from its Close button", async () => {
    const { onClose, user, dialog } = open();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const { onClose, user, dialog } = open();
    await user.keyboard("{Escape}");
    expect(dialog).not.toHaveAttribute("open");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on a click outside its content, not inside", async () => {
    const { onClose, user, dialog } = open();
    await user.click(screen.getByText("Body"));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(dialog);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus inside when it opens", () => {
    open();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("stays open on Escape and outside clicks when it must not be dismissed", async () => {
    const { onClose, user, dialog } = open({ dismissible: false });
    await user.keyboard("{Escape}");
    await user.click(dialog);
    expect(dialog).toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("can render into document.body", () => {
    const { dialog } = open({ portal: true });
    expect(dialog.parentElement).toBe(document.body);
  });
});
