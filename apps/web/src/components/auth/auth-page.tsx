import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMascot } from "@/components/brand";
import { PageTransition } from "@/components/page-transition";
import { geist } from "@/lib/fonts";
import { AuthArt } from "./auth-art";
import styles from "./auth-page.module.css";

/**
 * The sign-in, sign-up and password pages, laid out like Mobbin's: the form
 * on the left, the art drifting on the right (hidden on narrow screens), in
 * the landing's light, monochrome look. The panel sets the app's colour
 * tokens to the landing's values, so the shared fields and buttons follow.
 */
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
