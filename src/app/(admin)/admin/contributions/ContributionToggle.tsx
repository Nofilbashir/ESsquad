"use client";

import { useState, useTransition } from "react";
import { markPayment } from "@/actions/contributions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

interface Props {
  memberId: string;
  month: number;
  year: number;
  currentStatus: "PAID" | "UNPAID";
}

export default function ContributionToggle({
  memberId,
  month,
  year,
  currentStatus,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle() {
    setError(null);
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    startTransition(async () => {
      const result = await markPayment({ memberId, month, year, status: newStatus });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (currentStatus === "PAID") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={toggle}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin inline" />
          ) : (
            "Mark Unpaid"
          )}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={toggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CheckCircle className="h-3 w-3 mr-1" />
        )}
        Mark Paid
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
