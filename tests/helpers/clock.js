export function advanceBy(ms) {
  jest.advanceTimersByTime(ms);
}

export function advanceSeconds(sec) {
  advanceBy(sec * 1000);
}
