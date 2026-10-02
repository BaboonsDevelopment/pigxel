import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCALE,
  MAX_SCALE,
  MIN_SCALE,
} from "@/components/pixel-canvas/constants";
import {
  fromTouchpad,
  pinchZoom,
  scrollToAnchor,
  stepZoom,
  wheelSource,
  zoomAnchor,
} from "@/components/pixel-canvas/wheel";

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height }) as DOMRect;

describe("telling a touchpad from a mouse wheel", () => {
  it("takes Firefox's line scrolling for a mouse wheel", () => {
    expect(fromTouchpad({ deltaY: 3, deltaMode: 1 })).toBe(false);
  });

  it("takes notches of 120 for a mouse wheel", () => {
    // Windows Chrome: 100 pixels a notch; macOS Chrome: 4.
    expect(fromTouchpad({ deltaY: 100, deltaMode: 0, wheelDeltaY: -120 })).toBe(
      false,
    );
    expect(fromTouchpad({ deltaY: 4, deltaMode: 0, wheelDeltaY: -120 })).toBe(
      false,
    );
  });

  it("takes pixel deltas three times the old ones for a touchpad", () => {
    expect(fromTouchpad({ deltaY: 6, deltaMode: 0, wheelDeltaY: -18 })).toBe(
      true,
    );
  });

  it("takes fractional deltas, as pinches send, for a touchpad", () => {
    expect(fromTouchpad({ deltaY: 2.5, deltaMode: 0, wheelDeltaY: -120 })).toBe(
      true,
    );
  });

  it("keeps a touchpad gesture a touchpad through its gliding tail", () => {
    const isTouchpad = wheelSource();
    const event = (timeStamp: number, deltaY: number, wheelDeltaY: number) => ({
      timeStamp,
      deltaY,
      deltaMode: 0,
      wheelDeltaY,
    });
    expect(isTouchpad(event(0, 6, -18))).toBe(true);
    // Momentum can send a round delta that looks like a notch.
    expect(isTouchpad(event(16, 4, -120))).toBe(true);
    // Much later, a real mouse notch is a mouse again.
    expect(isTouchpad(event(2000, 4, -120))).toBe(false);
  });
});

describe("zooming", () => {
  it("zooms a step per notch, within the bounds", () => {
    expect(stepZoom(DEFAULT_SCALE, -1)).toBeGreaterThan(DEFAULT_SCALE);
    expect(stepZoom(DEFAULT_SCALE, 1)).toBeLessThan(DEFAULT_SCALE);
    expect(stepZoom(MAX_SCALE, -1)).toBe(MAX_SCALE);
    expect(stepZoom(MIN_SCALE, 1)).toBe(MIN_SCALE);
  });

  it("pinches smoothly: small deltas zoom a little, out zooms in", () => {
    const zoomed = pinchZoom(DEFAULT_SCALE, -2);
    expect(zoomed).toBeGreaterThan(DEFAULT_SCALE);
    expect(zoomed).toBeLessThan(DEFAULT_SCALE * 1.05);
    expect(pinchZoom(DEFAULT_SCALE, 2)).toBeLessThan(DEFAULT_SCALE);
    // Pinching in and back out by the same amount comes back to the start.
    expect(pinchZoom(pinchZoom(DEFAULT_SCALE, 7), -7)).toBeCloseTo(
      DEFAULT_SCALE,
    );
    expect(pinchZoom(DEFAULT_SCALE, -10_000)).toBe(MAX_SCALE);
  });

  it("scrolls the zoomed tile so the spot under the cursor stays there", () => {
    // A 160px tile at (100, 50); the cursor a quarter across, halfway down.
    const before = rect(100, 50, 160, 160);
    const anchor = zoomAnchor(before, 140, 130);
    expect(anchor).toEqual({ x: 140, y: 130, fx: 0.25, fy: 0.5 });
    // Twice the size, grown from the same corner: scroll by what it grew there.
    const after = rect(100, 50, 320, 320);
    expect(scrollToAnchor(after, anchor)).toEqual({ x: 40, y: 80 });
    // Nothing to scroll when the tile didn't move or grow.
    expect(scrollToAnchor(before, anchor)).toEqual({ x: 0, y: 0 });
  });
});
