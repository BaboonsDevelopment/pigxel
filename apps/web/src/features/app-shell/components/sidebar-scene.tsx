import Image from "next/image";
import landscape from "../../../../public/art/sidebar-landscape.webp";

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
