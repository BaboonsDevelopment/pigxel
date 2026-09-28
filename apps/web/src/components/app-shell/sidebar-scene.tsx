import Image from "next/image";
import landscape from "../../../public/art/sidebar-landscape.webp";

/**
 * The pixel landscape between the navigation and the footer: the Pigxel pig
 * on a cliff above pink mountains. It's anchored to the bottom so the pig
 * stays in view at any height, and its sky fades into the sidebar at the top.
 */
export function SidebarScene() {
  return (
    <div
      aria-hidden="true"
      className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
    >
      <Image
        src={landscape}
        alt=""
        fill
        sizes="240px"
        placeholder="blur"
        className="object-cover object-bottom"
      />
    </div>
  );
}
