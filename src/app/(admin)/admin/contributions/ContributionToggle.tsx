"use client";

import { useState, useTransition } from "react";
import { markPayment } from "@/actions/contributions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";

interface Props {
  memberId: string;
  month: number;
  year: number;
  currentStatus: "PAID" | "UNPAID";
  defaultAmount: number;
}

export default function ContributionToggle({
  memberId,
  month,
  year,
  currentStatus,
  defaultAmount,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(defaultAmount));
  const router = useRouter();

  function markPaid() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < 1) { setError("Invalid amount"); return; }
    setError(null);
    startTransition(async () => {
      const result = await markPayment({ memberId, month, year, status: "PAID", amount: parsed });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function markUnpaid() {
    setError(null);
    startTransition(async () => {
      const result = await markPayment({ memberId, month, year, status: "UNPAID" });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (currentStatus === "PAID") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={markUnpaid}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Mark Unpaid"}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") markPaid(); }}
          className="h-8 w-16 text-sm px-2 text-right"
          disabled={isPending}
        />
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white h-8"
          onClick={markPaid}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
          Paid
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
