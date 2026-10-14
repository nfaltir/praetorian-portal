"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/*
  false during server render and before hydration, true after.
  Password forms handled in JavaScript keep their submit button disabled
  until this is true, so a fast click can never fall back to a native
  form submission (which would default to GET and put the password in
  the URL, browser history and server logs).
*/
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
