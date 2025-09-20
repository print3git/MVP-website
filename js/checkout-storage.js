const CHECKOUT_KEY = "print2CheckoutItems";

export function readCheckoutItems() {
  try {
    const raw = localStorage.getItem(CHECKOUT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCheckoutItems(items) {
  try {
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(items));
  } catch {}
}

export function clearCheckoutItems() {
  try {
    localStorage.removeItem(CHECKOUT_KEY);
  } catch {}
}

export function createCheckoutMatcher(existingItems) {
  const prevEntries = (Array.isArray(existingItems) ? existingItems : []).map(
    (prev, idx) => ({
      prev,
      idx,
      used: false,
    }),
  );
  const claimPrev = (predicate) => {
    const entry = prevEntries.find(
      (candidate) => !candidate.used && predicate(candidate),
    );
    if (!entry) return null;
    entry.used = true;
    return entry.prev && typeof entry.prev === "object" ? entry.prev : {};
  };
  return (item, index) => {
    const byJob =
      item?.jobId &&
      claimPrev(
        (candidate) =>
          candidate.prev?.jobId && candidate.prev.jobId === item.jobId,
      );
    if (byJob) return byJob;
    const byModel =
      item?.modelUrl &&
      claimPrev(
        (candidate) =>
          candidate.prev?.modelUrl && candidate.prev.modelUrl === item.modelUrl,
      );
    if (byModel) return byModel;
    const sameIndex = claimPrev(
      (candidate) =>
        candidate.idx === index &&
        candidate.prev &&
        typeof candidate.prev === "object",
    );
    if (sameIndex) return sameIndex;
    const anyWithData = claimPrev(
      (candidate) => candidate.prev && typeof candidate.prev === "object",
    );
    if (anyWithData) return anyWithData;
    const any = claimPrev(() => true);
    if (any) return any;
    return {};
  };
}
