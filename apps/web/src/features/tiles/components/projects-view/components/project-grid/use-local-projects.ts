"use client";

import { useReducer, useState } from "react";
import { readMarks, writeMark } from "../../../../local-marks";
import { readLocalProjects } from "../../helpers";

export function useLocalProjects(userId: string) {
  const [projects, refresh] = useReducer(
    () => readLocalProjects(userId),
    userId,
    readLocalProjects,
  );
  const [pins, setPins] = useState(() => readMarks(userId, "pinned"));
  const [archived, setArchived] = useState(() => readMarks(userId, "archived"));

  return {
    projects,
    refresh,
    pins,
    archived,
    pin: (id: string, on: boolean) => {
      writeMark(userId, "pinned", id, on);
      setPins(readMarks(userId, "pinned"));
    },
    archive: (id: string, on: boolean) => {
      writeMark(userId, "archived", id, on);
      setArchived(readMarks(userId, "archived"));
    },
  };
}
