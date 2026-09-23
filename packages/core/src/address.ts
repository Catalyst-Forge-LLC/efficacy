import { isIP } from "node:net";

function ipv4Octets(ip: string): number[] {
  return ip.split(".").map((part) => Number(part));
}

function ipv4NonPublic(ip: string): boolean {
  const [a = 0, b = 0, c = 0] = ipv4Octets(ip);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function ipv6NonPublic(ip: string): boolean {
  const lower = ip.toLowerCase();
  const mapped = /^(?:0*:)*:?ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower) ?? /^::(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped?.[1]) return ipv4NonPublic(mapped[1]);
  if (lower === "::" || lower === "::1") return true;
  const first = Number.parseInt(lower.split(":")[0] || "0", 16);
  return (
    (first & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (first & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (first & 0xff00) === 0xff00 // ff00::/8 multicast
  );
}

/** Loopback, private, link-local, shared, multicast, or reserved. */
export function addressIsNonPublic(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return ipv4NonPublic(ip);
  if (family === 6) return ipv6NonPublic(ip);
  return true;
}

/** Local names and non-public IP literals. Other names still need a DNS check at fetch time. */
export function hostnameIsNonPublic(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  return isIP(host) !== 0 && addressIsNonPublic(host);
}
