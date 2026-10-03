import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMascot } from "@/components/ui/brand";
import { PageTransition } from "@/components/layout/page-transition";
import { geist } from "@/lib/fonts/geist";
import { AuthArt } from "./auth-art";
import styles from "./auth-page.module.css";

export function AuthPage({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${geist.variable} ${styles.page}`}>
      <main className={styles.panel}>
        <PageTransition>
          <div className={styles.inner}>
            <Link href="/" aria-label="Pigxel home" className={styles.logo}>
              <BrandMascot className={styles.logoIcon} priority />
            </Link>
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
            <div className={styles.body}>{children}</div>
          </div>
        </PageTransition>
      </main>
      <AuthArt />
    </div>
  );
}
