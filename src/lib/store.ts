import "server-only";

import fs from "fs";
import { buildSeed, hydrateJobAddresses } from "@/lib/seed";
import type { Store } from "@/lib/types";

type Bucket = { pid: number; version: number; store: Store };

const VERSION = 1;
const FILE = "/tmp/jobflow-store.json";
const globalStore = globalThis as { __jobflow?: Store };

export function getStore() {
  if (!globalStore.__jobflow) {
    globalStore.__jobflow = readBucket() ?? hydrateJobAddresses(buildSeed(new Date()));
    persistStore(globalStore.__jobflow);
  }
  return globalStore.__jobflow;
}

export function persistStore(store: Store) {
  const payload: Bucket = { pid: process.pid, version: VERSION, store };
  try {
    fs.writeFileSync(FILE, JSON.stringify(payload));
  } catch {
    // Mock mode keeps the store in memory when the disk is not writable.
  }
}

function readBucket() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Bucket;
    if (parsed.version !== VERSION || parsed.pid !== process.pid) return null;
    return parsed.store;
  } catch {
    return null;
  }
}
