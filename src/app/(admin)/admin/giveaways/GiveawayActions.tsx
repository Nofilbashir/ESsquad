"use client";

import { useState, useTransition } from "react";
import { distributeGiveaway, deleteGiveaway } from "@/actions/giveaways";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Trash2, Loader2 } from "lucide-react";

interface Props {
  giveawayId: string;
  status: "DRAFT" | "DISTRIBUTED";
}

export default function GiveawayActions({ giveawayId, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDistribute() {
    if (!confirm("Distribute this giveaway? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await distributeGiveaway(giveawayId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this giveaway? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteGiveaway(giveawayId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (status === "DISTRIBUTED") {
    return (
      <span className="text-xs text-muted-foreground">Distributed</span>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={handleDistribute}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Send className="h-3 w-3 mr-1" />
        )}
        Distribute
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
