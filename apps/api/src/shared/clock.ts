export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };
export const fixedClock = (iso: string): Clock & { set(iso: string): void } => {
  let current = new Date(iso);
  return { now: () => new Date(current), set: (v) => (current = new Date(v)) };
};
