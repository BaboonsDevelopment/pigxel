// Browser APIs jsdom leaves out but Pigxel components rely on. Import from a
// jsdom setup file, next to Testing Library's matchers and cleanup.

// <dialog>: jsdom has the element but none of its methods. Like a browser,
// showModal() focuses the first focusable element inside, and Escape asks the
// topmost open modal to close wherever focus is.
const dialog = globalThis.HTMLDialogElement?.prototype;
if (dialog && !dialog.showModal) {
  const modals: HTMLDialogElement[] = [];
  const FOCUSABLE =
    "[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    while (modals.length && !modals.at(-1)?.isConnected) modals.pop();
    const top = modals.at(-1);
    if (!top) return;
    event.preventDefault();
    top.requestClose();
  });
  dialog.show = function () {
    this.setAttribute("open", "");
  };
  dialog.showModal = function () {
    this.setAttribute("open", "");
    modals.push(this);
    this.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };
  dialog.close = function (returnValue?: string) {
    if (!this.hasAttribute("open")) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.removeAttribute("open");
    const at = modals.indexOf(this);
    if (at !== -1) modals.splice(at, 1);
    this.dispatchEvent(new Event("close"));
  };
  dialog.requestClose = function (returnValue?: string) {
    if (this.dispatchEvent(new Event("cancel", { cancelable: true })))
      this.close(returnValue);
  };
}

class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.ResizeObserver ??= InertObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??=
  InertObserver as unknown as typeof IntersectionObserver;

window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

Element.prototype.scrollIntoView ??= function () {};
Element.prototype.setPointerCapture ??= function () {};
Element.prototype.releasePointerCapture ??= function () {};
Element.prototype.hasPointerCapture ??= () => false;

// Without the native `canvas` package jsdom logs "Not implemented" for every
// getContext call; answer null quietly, as a browser without 2D support would.
// Tests that need a context stub getContext themselves.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;
