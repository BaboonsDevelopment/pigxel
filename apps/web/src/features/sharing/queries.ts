"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import {
  inviteToProject,
  loadProjectAccess,
  loadProjectSharing,
  removeMember,
  resetShareLink,
  setLinkAccess,
  setMemberRole,
  stopSharing,
} from "./actions";
import type { LinkAccess, ProjectSharing, ShareRole } from "./sharing";

export const sharingKey = (tileId: string) => ["sharing", tileId] as const;

export function useProjectAccess(tileId: string | null) {
  return useQuery({
    queryKey: ["project-access", tileId],
    queryFn: () => loadProjectAccess(tileId ?? ""),
    enabled: tileId !== null,
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  }).data;
}

async function ensure(result: Promise<{ error?: string }>) {
  const { error } = await result;
  if (error) throw new Error(error);
}

function patch(
  client: QueryClient,
  tileId: string,
  change: (sharing: ProjectSharing) => ProjectSharing,
) {
  client.setQueryData<ProjectSharing>(sharingKey(tileId), (sharing) =>
    sharing ? change(sharing) : sharing,
  );
}

export function useProjectSharing(tileId: string) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: sharingKey(tileId),
    queryFn: () => loadProjectSharing(tileId),
    staleTime: 0,
  });
  const settle = () =>
    client.invalidateQueries({ queryKey: sharingKey(tileId) });
  const fail = (e: Error) => setError(e.message);

  const invite = useMutation({
    mutationFn: ({ username, role }: { username: string; role: ShareRole }) =>
      ensure(inviteToProject(tileId, username, role)),
    onMutate: () => setError(null),
    onError: fail,
    onSettled: settle,
  });

  const role = useMutation({
    mutationFn: ({ id, role }: { id: string; role: ShareRole }) =>
      ensure(setMemberRole(tileId, id, role)),
    onMutate: ({ id, role }) => {
      setError(null);
      patch(client, tileId, (sharing) => ({
        ...sharing,
        people: sharing.people.map((person) =>
          person.id === id ? { ...person, role, viaLink: false } : person,
        ),
      }));
    },
    onError: fail,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id: string) => ensure(removeMember(tileId, id)),
    onMutate: (id) => {
      setError(null);
      patch(client, tileId, (sharing) => ({
        ...sharing,
        people: sharing.people.filter((person) => person.id !== id),
      }));
    },
    onError: fail,
    onSettled: settle,
  });

  const link = useMutation({
    mutationFn: (access: LinkAccess) => ensure(setLinkAccess(tileId, access)),
    onMutate: (access) => {
      setError(null);
      patch(client, tileId, (sharing) => ({
        link: { ...sharing.link, access },
        people:
          access === "off"
            ? sharing.people.filter((person) => !person.viaLink)
            : sharing.people.map((person) =>
                person.viaLink
                  ? { ...person, role: access === "edit" ? "editor" : "viewer" }
                  : person,
              ),
      }));
    },
    onError: fail,
    onSettled: settle,
  });

  const stop = useMutation({
    mutationFn: () => ensure(stopSharing(tileId)),
    onMutate: () => {
      setError(null);
      patch(client, tileId, () => ({
        people: [],
        link: { access: "off", token: null },
      }));
    },
    onError: fail,
    onSettled: settle,
  });

  const reset = useMutation({
    mutationFn: () => ensure(resetShareLink(tileId)),
    onMutate: () => {
      setError(null);
      patch(client, tileId, (sharing) => ({
        ...sharing,
        people: sharing.people.filter((person) => !person.viaLink),
      }));
    },
    onError: fail,
    onSettled: settle,
  });

  return {
    sharing: query.data,
    loading: query.isPending,
    loadError: query.error?.message ?? null,
    error,
    inviting: invite.isPending,
    resetting: reset.isPending,
    invite: (username: string, role: ShareRole) =>
      invite.mutateAsync({ username, role }).then(
        () => true,
        () => false,
      ),
    setRole: (id: string, value: ShareRole) => role.mutate({ id, role: value }),
    remove: (id: string) => remove.mutate(id),
    setLink: (access: LinkAccess) => link.mutate(access),
    resetLink: () => reset.mutate(),
    stopSharing: () => stop.mutate(),
  };
}
