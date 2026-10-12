"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { loadPopularTiles } from "../../../actions";
import { readFeedOrder, saveFeedOrder } from "../../../feed-order";

const subscribe = () => () => {};

const BUTTON =
  "flex size-7 cursor-pointer items-center justify-center rounded-md border bg-background transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40 disabled:hover:bg-background";

export function ArtNav({ tileId }: { tileId: string }) {
  const router = useRouter();
  const order = useSyncExternalStore(subscribe, readFeedOrder, () => null);
  const [loading, setLoading] = useState(false);
  const index = order ? order.ids.indexOf(tileId) : -1;
  const previous = index > 0 ? order!.ids[index - 1] : undefined;
  const next = index >= 0 ? order!.ids[index + 1] : undefined;
  const canLoadMore =
    !!order && index === order.ids.length - 1 && order.ids.length < order.count;

  useEffect(() => {
    if (previous) router.prefetch(`/explore/${previous}`);
    if (next) router.prefetch(`/explore/${next}`);
  }, [router, previous, next]);

  const goNext = async () => {
    if (next) return router.push(`/explore/${next}`);
    if (!order || !canLoadMore || loading) return;
    setLoading(true);
    try {
      const { tiles } = await loadPopularTiles(order.ids.length, order.filters);
      const added = tiles
        .map((t) => t.id)
        .filter((id) => !order.ids.includes(id));
      if (!added.length) return;
      saveFeedOrder({ ...order, ids: [...order.ids, ...added] });
      router.push(`/explore/${added[0]}`);
    } finally {
      setLoading(false);
    }
  };

  const goPrevious = () => {
    if (previous) router.push(`/explore/${previous}`);
  };

  const actions = useRef({ goNext, goPrevious });
  useLayoutEffect(() => {
    actions.current = { goNext, goPrevious };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']"))
        return;
      if (e.key === "ArrowLeft") actions.current.goPrevious();
      if (e.key === "ArrowRight") void actions.current.goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (index < 0) return null;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-3">
      <button
        type="button"
        aria-label="Previous art"
        title="Previous art (←)"
        disabled={!previous}
        onClick={goPrevious}
        className={BUTTON}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="m10 3.5-4.5 4.5 4.5 4.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next art"
        title="Next art (→)"
        disabled={(!next && !canLoadMore) || loading}
        onClick={() => void goNext()}
        className={BUTTON}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="m6 3.5 4.5 4.5L6 12.5" />
        </svg>
      </button>
    </span>
  );
}
