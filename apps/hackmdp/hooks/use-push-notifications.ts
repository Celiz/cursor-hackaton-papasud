"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isPushSupported,
  getSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supportedNow = isPushSupported();
    setSupported(supportedNow);
    if (!supportedNow) {
      setLoading(false);
      return;
    }
    setPermission(Notification.permission);
    getSubscription()
      .then((sub) => setSubscribed(!!sub))
      .finally(() => setLoading(false));
  }, []);

  const enable = useCallback(async () => {
    setLoading(true);
    const result = await subscribeToPush();
    if (result.success) {
      setSubscribed(true);
      setPermission(Notification.permission);
    }
    setLoading(false);
    return result;
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setLoading(false);
  }, []);

  return { supported, subscribed, permission, loading, enable, disable };
}
