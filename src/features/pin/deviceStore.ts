/**
 * Accounts that can log in with a PIN on this browser. The server trusts the device by
 * deviceId + deviceSecret (it keeps only a hash of the secret); the PIN itself is never
 * stored here. Kept in localStorage so it survives closing the app; logging out keeps it,
 * "Remove from this device" or a DEVICE_NOT_TRUSTED answer drops it.
 */
export interface SavedDevice {
  deviceId: string;
  deviceSecret: string;
  deviceName?: string;
  /** Tenant the account belongs to (several organisations can share a browser). */
  tenantId?: string;
  /** Shown on the PIN screen, e.g. "Reena · r***@gmail.com". */
  label: string;
  /** Login email/phone when known (pre-fills OTP login for "Forgot PIN"). */
  identifier?: string;
  savedAt: string;
  lastUsedAt?: string;
}

const KEY = "cst.pin.devices";

function read(): SavedDevice[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((d): d is SavedDevice => !!d && typeof d.deviceId === "string" && typeof d.deviceSecret === "string")
      : [];
  } catch {
    return [];
  }
}

function write(list: SavedDevice[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage unavailable: PIN login just isn't offered next time
  }
}

const lastSeen = (d: SavedDevice) => d.lastUsedAt ?? d.savedAt;

export const deviceStore = {
  /** Accounts for this tenant (or saved without one), most recently used first. */
  list(tenantId?: string | null): SavedDevice[] {
    return read()
      .filter((d) => !tenantId || !d.tenantId || d.tenantId === tenantId)
      .sort((a, b) => lastSeen(b).localeCompare(lastSeen(a)));
  },
  /** Adds or replaces (same deviceId, or another entry for the same account). */
  save(device: Omit<SavedDevice, "savedAt"> & { savedAt?: string }, replaces?: string[]): SavedDevice {
    const entry: SavedDevice = { ...device, savedAt: device.savedAt ?? new Date().toISOString() };
    const drop = new Set([entry.deviceId, ...(replaces ?? [])]);
    write([entry, ...read().filter((d) => !drop.has(d.deviceId))]);
    return entry;
  },
  touch(deviceId: string): void {
    write(read().map((d) => (d.deviceId === deviceId ? { ...d, lastUsedAt: new Date().toISOString() } : d)));
  },
  /** The account's login email/phone changed: later "Forgot PIN" uses the new one. */
  changeIdentifier(oldIdentifier: string, newIdentifier: string, label: string): void {
    write(read().map((d) => (d.identifier === oldIdentifier ? { ...d, identifier: newIdentifier, label } : d)));
  },
  remove(deviceId: string): void {
    write(read().filter((d) => d.deviceId !== deviceId));
  },
};
