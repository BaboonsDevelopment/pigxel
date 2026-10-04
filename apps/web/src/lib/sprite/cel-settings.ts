export type CelSetting = {
  frameId: string;
  layerId: string;
  opacity?: number;
  zIndex?: number;
};

export function readCelSettings(
  value: unknown,
  frames: string[],
  layers: string[],
): CelSetting[] {
  if (!Array.isArray(value)) return [];
  const frameIds = new Set(frames);
  const layerIds = new Set(layers);
  const seen = new Set<string>();
  return value.flatMap((entry): CelSetting[] => {
    if (!entry || typeof entry !== "object") return [];
    const setting = entry as Record<string, unknown>;
    if (
      typeof setting.frameId !== "string" ||
      typeof setting.layerId !== "string" ||
      !frameIds.has(setting.frameId) ||
      !layerIds.has(setting.layerId)
    )
      return [];
    const key = `${setting.frameId}:${setting.layerId}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const opacity =
      typeof setting.opacity === "number" &&
      Number.isInteger(setting.opacity) &&
      setting.opacity >= 0 &&
      setting.opacity <= 255
        ? setting.opacity
        : undefined;
    const zIndex =
      typeof setting.zIndex === "number" &&
      Number.isInteger(setting.zIndex) &&
      setting.zIndex >= 0 &&
      setting.zIndex < layers.length
        ? setting.zIndex
        : undefined;
    return opacity === undefined && zIndex === undefined
      ? []
      : [
          {
            frameId: setting.frameId,
            layerId: setting.layerId,
            ...(opacity !== undefined && { opacity }),
            ...(zIndex !== undefined && { zIndex }),
          },
        ];
  });
}

export function pruneCelSettings(
  settings: CelSetting[],
  frames: string[],
  layers: string[],
): CelSetting[] {
  const frameIds = new Set(frames);
  const layerIds = new Set(layers);
  return settings.filter(
    (setting) => frameIds.has(setting.frameId) && layerIds.has(setting.layerId),
  );
}

export function settingsForFrame(settings: CelSetting[], frameId: string) {
  return new Map(
    settings
      .filter((setting) => setting.frameId === frameId)
      .map((setting) => [setting.layerId, setting]),
  );
}
