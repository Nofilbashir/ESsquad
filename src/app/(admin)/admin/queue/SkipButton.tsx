"use client";

import { useState, useTransition } from "react";
import { skipMemberInQueue } from "@/actions/members";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkipForward, Loader2 } from "lucide-react";

interface Props {
  memberId: string;
  memberName: string;
}

export default function SkipButton({ memberId, memberName }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await skipMemberInQueue(memberId);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <SkipForward className="h-3 w-3 mr-1" />
        Skip
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!isPending) setOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Skip member?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{memberName}</span> will be moved to the end of the queue. This cannot be undone automatically.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Yes, skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
