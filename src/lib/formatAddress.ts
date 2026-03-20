/** Shorten `0x` address for display (e.g. 0x1234…abcd). */
export function shortenAddress(address: string, head = 6, tail = 4): string {
  if (!address.startsWith("0x") || address.length < 2 + head + tail) return address;
  return `${address.slice(0, 2 + head)}…${address.slice(-tail)}`;
}
