"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type NotifyPref = "my-turn" | "few-ahead";

interface NotifyState {
  permission: NotificationPermission | "unsupported";
  prefs: Set<NotifyPref>;
  supported: boolean;
}

function loadPrefs(code: string): Set<NotifyPref> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`notify_prefs_${code}`);
    if (raw) return new Set(JSON.parse(raw) as NotifyPref[]);
  } catch {}
  return new Set();
}

function savePrefs(code: string, prefs: Set<NotifyPref>) {
  localStorage.setItem(`notify_prefs_${code}`, JSON.stringify([...prefs]));
}

export function useNotifications(code: string) {
  const [state, setState] = useState<NotifyState>({
    permission: "unsupported",
    prefs: new Set(),
    supported: false,
  });

  // Track what we've already notified to avoid repeats
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supported = typeof window !== "undefined" && "Notification" in window;
    setState({
      permission: supported ? Notification.permission : "unsupported",
      prefs: loadPrefs(code),
      supported,
    });
  }, [code]);

  const requestPermission = useCallback(async () => {
    if (!state.supported) return;
    const result = await Notification.requestPermission();
    setState((s) => ({ ...s, permission: result }));
  }, [state.supported]);

  const togglePref = useCallback(
    async (pref: NotifyPref) => {
      // If enabling a pref and permission not granted, request it first
      if (!state.prefs.has(pref) && state.permission !== "granted") {
        await requestPermission();
      }

      setState((s) => {
        const next = new Set(s.prefs);
        if (next.has(pref)) {
          next.delete(pref);
        } else {
          next.add(pref);
        }
        savePrefs(code, next);
        return { ...s, prefs: next };
      });
    },
    [code, state.prefs, state.permission, requestPermission]
  );

  const notify = useCallback(
    (key: string, title: string, body: string) => {
      if (state.permission !== "granted") return;
      if (notifiedRef.current.has(key)) return;
      notifiedRef.current.add(key);

      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch {
        // Safari / some mobile browsers may throw
      }
    },
    [state.permission]
  );

  // Reset notification tracking when entry changes (e.g., new queue join)
  const resetNotified = useCallback(() => {
    notifiedRef.current.clear();
  }, []);

  return {
    supported: state.supported,
    permission: state.permission,
    prefs: state.prefs,
    togglePref,
    notify,
    resetNotified,
  };
}
