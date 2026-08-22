"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export function PushNotificationsToggle() {
  const { supported, subscribed, loading, enable, disable } = usePushNotifications();

  if (!supported) return null;

  const handleClick = async () => {
    haptics.medium();
    if (subscribed) {
      await disable();
      toast.success("Notificaciones desactivadas");
    } else {
      const result = await enable();
      if (result.success) {
        toast.success("Notificaciones activadas");
      } else {
        toast.error(result.error || "No se pudieron activar");
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="small"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "h-9 w-9 !p-0 transition-all",
        subscribed
          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600"
      )}
      title={subscribed ? "Notificaciones activadas" : "Activar notificaciones"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </Button>
  );
}
