export type CelLink = {
  id: string;
  layerId: string;
  frameIds: string[];
};

export function readCelLinks(
  value: unknown,
  frames: string[],
  layers: string[],
): CelLink[] {
  if (!Array.isArray(value)) return [];
  const frameIds = new Set(frames);
  const layerIds = new Set(layers);
  const used = new Set<string>();
  return value.flatMap((entry): CelLink[] => {
    if (!entry || typeof entry !== "object") return [];
    const link = entry as Record<string, unknown>;
    if (
      typeof link.layerId !== "string" ||
      !layerIds.has(link.layerId) ||
      !Array.isArray(link.frameIds)
    )
      return [];
    const members = [
      ...new Set(
        link.frameIds.filter(
          (id): id is string => typeof id === "string" && frameIds.has(id),
        ),
      ),
    ];
    if (
      members.length < 2 ||
      members.some((id) => used.has(`${link.layerId}:${id}`))
    )
      return [];
    members.forEach((id) => used.add(`${link.layerId}:${id}`));
    return [
      {
        id:
          typeof link.id === "string" && link.id
            ? link.id
            : crypto.randomUUID(),
        layerId: link.layerId,
        frameIds: members,
      },
    ];
  });
}

export function pruneCelLinks(
  links: CelLink[],
  frames: string[],
  layers: string[],
): CelLink[] {
  const frameIds = new Set(frames);
  const layerIds = new Set(layers);
  return links.flatMap((link) => {
    if (!layerIds.has(link.layerId)) return [];
    const members = link.frameIds.filter((id) => frameIds.has(id));
    return members.length > 1 ? [{ ...link, frameIds: members }] : [];
  });
}

export function unlinkCel(
  links: CelLink[],
  layerId: string,
  frameId: string,
): CelLink[] {
  return links.flatMap((link) => {
    if (link.layerId !== layerId || !link.frameIds.includes(frameId))
      return [link];
    const members = link.frameIds.filter((id) => id !== frameId);
    return members.length > 1 ? [{ ...link, frameIds: members }] : [];
  });
}

export function linkCels(
  links: CelLink[],
  layerId: string,
  frameIds: string[],
): CelLink[] {
  const members = [...new Set(frameIds)];
  if (members.length < 2) return links;
  const remaining = members.reduce(
    (current, id) => unlinkCel(current, layerId, id),
    links,
  );
  return [
    ...remaining,
    { id: crypto.randomUUID(), layerId, frameIds: members },
  ];
}

export function linkOf(links: CelLink[], layerId: string, frameId: string) {
  return links.find(
    (link) => link.layerId === layerId && link.frameIds.includes(frameId),
  );
}
