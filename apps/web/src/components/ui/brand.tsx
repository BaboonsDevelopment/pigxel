import Image from "next/image";
import Link from "next/link";
import mascot from "../../public/art/pigxel-mascot-sitting.png";

export function BrandMascot({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={mascot}
      alt=""
      sizes="96px"
      priority={priority}
      draggable={false}
      className={className}
    />
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <BrandMascot className="h-auto w-10" />
      <span className="font-display text-2xl leading-none font-semibold tracking-tight">
        Pigxel
      </span>
    </Link>
  );
}
