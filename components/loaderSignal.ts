/**
 * Tiny signal so the hero headline can start the moment the loading screen is
 * done, rather than guessing a delay that would be wrong on a client-side
 * navigation to the home page or under reduced motion.
 *
 * LoadingScreen calls markLoaderFinished in every branch it can exit through,
 * so a waiter never hangs.
 */

let finished = false;
let waiters: Array<() => void> = [];

export function markLoaderFinished() {
  if (finished) return;
  finished = true;

  const pending = waiters;
  waiters = [];
  pending.forEach((resolve) => resolve());
}

export function whenLoaderFinished(): Promise<void> {
  if (finished) return Promise.resolve();
  return new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
}
