"use client";

import { useState, useTransition } from "react";
import { deleteGiveawayItem } from "@/actions/giveawayItems";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteItemButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      await deleteGiveawayItem(id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all"
        title="Delete item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!isPending) setOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{name}</span> will be removed from the catalog. This won't affect existing giveaways that already used this item.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
