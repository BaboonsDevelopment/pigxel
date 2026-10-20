import Image from "next/image";
import landscape from "../../../../public/art/sidebar-landscape.webp";

/** The landscape under the nav; short screens have no room for it. */
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
        className="object-cover object-bottom short:hidden"
      />
    </div>
  );
}
