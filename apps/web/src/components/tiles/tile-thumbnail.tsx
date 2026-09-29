import { flattenDocument, type PigxelDocument } from "@/lib/pigxel-file/format";

/** The tile drawn at its own size and scaled up crisply, on a checkerboard. */
export function TileThumbnail({ image }: { image: PigxelDocument }) {
  return (
    <canvas
      aria-hidden="true"
      width={image.width}
      height={image.height}
      className="size-full object-contain [image-rendering:pixelated]"
      ref={(canvas) => {
        canvas
          ?.getContext("2d")
          ?.putImageData(
            new ImageData(
              flattenDocument(image) as Uint8ClampedArray<ArrayBuffer>,
              image.width,
              image.height,
            ),
            0,
            0,
          );
      }}
    />
  );
}
