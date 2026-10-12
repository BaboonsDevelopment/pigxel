import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "../src/components/field";
import { Input } from "../src/components/input";

const email = (props: { hint?: string; error?: string }) =>
  render(
    <Field label="Email" htmlFor="email" {...props}>
      <Input id="email" aria-describedby="email-hint" />
    </Field>,
  );

describe("Field", () => {
  it("labels its input", () => {
    email({});
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email");
  });

  it("describes the input with its hint", () => {
    email({ hint: "We never share it." });
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "We never share it.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("replaces the hint with an announced error", () => {
    email({
      hint: "We never share it.",
      error: "Enter a valid email address.",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
    expect(screen.queryByText("We never share it.")).not.toBeInTheDocument();
  });
});
