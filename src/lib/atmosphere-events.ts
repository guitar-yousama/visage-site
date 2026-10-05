export const LIGHTNING_EVENT = "visage:lightning";
export const LIGHTNING_CANCEL_EVENT = "visage:lightning-cancel";

export type LightningDetail = {
  frames: Keyframe[];
  duration: number;
  startedAt: number;
  x: number;
};
