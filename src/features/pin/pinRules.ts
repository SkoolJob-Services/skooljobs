/** Same rules as signup's PinRules: six digits, not easy to guess. */
export const PIN_LENGTH = 6;
export const PIN_PATTERN = /^\d{6}$/;

/** All the same digit, a straight run up or down, or a repeating group of two or three. */
export function isTooSimple(pin: string): boolean {
  if (pin.length < 2) return true;
  let same = true;
  let up = true;
  let down = true;
  for (let i = 1; i < pin.length; i++) {
    const step = pin.charCodeAt(i) - pin.charCodeAt(i - 1);
    same &&= step === 0;
    up &&= step === 1;
    down &&= step === -1;
  }
  return same || up || down || repeats(pin, 2) || repeats(pin, 3);
}

function repeats(pin: string, period: number): boolean {
  if (pin.length % period !== 0) return false;
  for (let i = period; i < pin.length; i++) if (pin[i] !== pin[i - period]) return false;
  return true;
}

export interface NewPinErrors {
  pin?: string;
  confirm?: string;
}

/** Problems with a new PIN and its confirmation (empty object = fine). */
export function newPinErrors(pin: string, confirm: string): NewPinErrors {
  if (!PIN_PATTERN.test(pin)) return { pin: "Enter 6 digits." };
  if (isTooSimple(pin)) return { pin: "Too easy to guess. Avoid 111111, 123456, 121212 and the like." };
  if (confirm !== pin) return { confirm: confirm.length < PIN_LENGTH ? "Enter the PIN again." : "The PINs don't match." };
  return {};
}

/** Short name for this device in the trusted-device list, e.g. "Android · Chrome". */
export function guessDeviceName(userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const ua = userAgent.toLowerCase();
  const os = /android/.test(ua)
    ? "Android"
    : /iphone|ipad|ipod/.test(ua)
      ? "iPhone"
      : /windows/.test(ua)
        ? "Windows"
        : /mac os/.test(ua)
          ? "Mac"
          : /linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /edg\//.test(ua)
    ? "Edge"
    : /samsungbrowser/.test(ua)
      ? "Samsung Internet"
      : /chrome|crios/.test(ua)
        ? "Chrome"
        : /firefox|fxios/.test(ua)
          ? "Firefox"
          : /safari/.test(ua)
            ? "Safari"
            : "";
  return [os, browser].filter(Boolean).join(" · ") || "This device";
}
