export function audioRange(header: string | undefined, length: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, length - Number(match[2]));
  const requestedEnd = match[1] && match[2] ? Number(match[2]) : length - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= length ||
    requestedEnd < start
  )
    return false;
  return {
    start,
    end: Math.min(requestedEnd, length - 1, start + 1024 * 1024 - 1),
  };
}
