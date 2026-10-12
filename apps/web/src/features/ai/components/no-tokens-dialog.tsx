"use client";

import { createRoot } from "react-dom/client";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { PixelImage } from "@/components/ui/pixel-image";
import { tokens } from "./tokens-button/components/usage-dialog/helpers";

const ART = [
  ".......oo........oo.......",
  "......oppo......oppo......",
  "......oppooooooooppo......",
  ".......oppppppppppo...cc..",
  ".......opeppppppepo..cYYc.",
  ".......oppppppppppo..cYYc.",
  ".......olpnnnnnnplo...cc..",
  ".......oppnonnonppo.......",
  ".cc....oppnnnnnnppo...cc..",
  "cYYc...oppppppppppo..cYYc.",
  "cYYc....oooooooooo...cYYc.",
  ".cc.....opo....opo....cc..",
  "........ooo....ooo........",
];

const COLORS: Record<string, string> = {
  o: "fill-undo-surface",
  e: "fill-undo-surface",
  p: "fill-[#f6b3c8]",
  l: "fill-[#fbd3df]",
  n: "fill-progress-fill",
  c: "fill-[#c98a1e]",
  Y: "fill-[#f5c542]",
};

let open = false;

export function showNoTokens(left: number, onGetTokens: () => void) {
  if (open) return;
  open = true;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  root.render(
    <Dialog
      size="sm"
      onClose={() => {
        open = false;
        root.unmount();
        host.remove();
      }}
      aria-describedby="no-tokens-message"
    >
      <NoTokensBody left={left} onGetTokens={onGetTokens} />
    </Dialog>,
  );
}

function NoTokensBody({
  left,
  onGetTokens,
}: {
  left: number;
  onGetTokens: () => void;
}) {
  const { close } = useDialog();
  return (
    <>
      <ModalHeader title="Not Enough Tokens" className="bg-error-soft" />
      <DialogBody className="grid gap-4 py-5">
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${ART[0]!.length} ${ART.length}`}
          shapeRendering="crispEdges"
          className="mx-auto h-[78px] w-[156px]"
        >
          {ART.flatMap((row, y) =>
            [...row].map((cell, x) =>
              COLORS[cell] ? (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={1}
                  height={1}
                  className={COLORS[cell]}
                />
              ) : null,
            ),
          )}
        </svg>
        <p className="flex items-center justify-center gap-2 rounded-xl bg-attention-soft px-4 py-3 text-sm font-medium">
          <PixelImage
            src="/art/coins-icon.png"
            alt=""
            width={23}
            height={30}
            className="h-5 w-auto"
          />
          {tokens(left)} {left === 1 ? "token" : "tokens"} remaining
        </p>
        <p id="no-tokens-message" className="text-sm">
          You need more tokens to generate your next creation. Get more tokens
          to keep your pixels flowing.
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" autoFocus onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton
          onClick={() => {
            close();
            onGetTokens();
          }}
        >
          Get More Tokens
        </ModalButton>
      </DialogFooter>
    </>
  );
}
