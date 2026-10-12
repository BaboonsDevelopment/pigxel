"use client";

import { useEffect, useState } from "react";
import { claimEdit, releaseEdit } from "./actions";

const HEARTBEAT = 15_000;

export function useEditLock(tileId: string | null) {
  const [lock, setLock] = useState<{
    tileId: string;
    holder: string | null;
  } | null>(null);

  useEffect(() => {
    if (!tileId) return;
    let live = true;
    const claim = () =>
      void claimEdit(tileId).then((result) => {
        if (live && result) setLock({ tileId, holder: result.holder });
      });
    claim();
    const timer = setInterval(claim, HEARTBEAT);
    return () => {
      live = false;
      clearInterval(timer);
      void releaseEdit(tileId);
    };
  }, [tileId]);

  return lock?.tileId === tileId ? lock.holder : null;
}
