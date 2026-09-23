import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { addressIsNonPublic, hostnameIsNonPublic } from "@efficacy/core";

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

/** Resolves like dns.lookup, but refuses any answer that is not a public address. */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as LookupAddress[];
    const blocked = list.find((entry) => addressIsNonPublic(entry.address));
    if (blocked) {
      return callback(new Error(`${hostname} resolves to non-public address ${blocked.address}`), "", 0);
    }
    const first = list[0];
    if (!first) return callback(new Error(`${hostname} did not resolve`), "", 0);
    if ((options as { all?: boolean }).all) {
      return (callback as unknown as (err: null, all: LookupAddress[]) => void)(null, list);
    }
    return callback(null, first.address, first.family);
  });
};

function checkUrl(url: URL): void {
  if (url.protocol !== "https:") throw new Error(`refusing non-https URL ${url.href}`);
  if (url.username || url.password) throw new Error(`refusing URL with credentials ${url.origin}`);
  if (hostnameIsNonPublic(url.hostname)) throw new Error(`refusing local or private host ${url.hostname}`);
}

function getOnce(url: URL): Promise<{ status: number; location?: string; body?: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", lookup: publicOnlyLookup, timeout: TIMEOUT_MS }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        res.resume();
        resolve({ status, location: res.headers.location });
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`${url.href} returned HTTP ${status}`));
        return;
      }
      const declared = Number(res.headers["content-length"] ?? 0);
      if (declared > MAX_EVIDENCE_BYTES) {
        res.destroy();
        reject(new Error(`${url.href} is ${declared} bytes; the limit is ${MAX_EVIDENCE_BYTES}`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_EVIDENCE_BYTES) {
          res.destroy();
          reject(new Error(`${url.href} exceeded ${MAX_EVIDENCE_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ status, body: new Uint8Array(Buffer.concat(chunks)) }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`${url.href} timed out after ${TIMEOUT_MS} ms`)));
    req.on("error", reject);
    req.end();
  });
}

/** GET over https to public hosts only. Every redirect hop is checked the same way. */
export async function fetchEvidence(href: string): Promise<Uint8Array> {
  let url = new URL(href);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    checkUrl(url);
    const result = await getOnce(url);
    if (result.body) return result.body;
    if (!result.location) throw new Error(`${url.href} redirected without a Location header`);
    url = new URL(result.location, url);
  }
  throw new Error(`${href} redirected more than ${MAX_REDIRECTS} times`);
}
