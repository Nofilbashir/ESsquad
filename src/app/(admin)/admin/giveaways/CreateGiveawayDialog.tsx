"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { createGiveaway } from "@/actions/giveaways";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gift, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface QueueMember {
  _id: string;
  name: string;
  phone: string;
  queuePosition: number;
  hasReceivedGiveaway: boolean;
}

interface CatalogItem {
  _id: string;
  name: string;
  estimatedValue: number;
}

interface Prize {
  id: string;
  itemName: string;
  itemValue: string;
  memberId: string;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function newPrize(): Prize {
  return { id: Math.random().toString(36).slice(2), itemName: "", itemValue: "", memberId: "" };
}

export default function CreateGiveawayDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueMember[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const router = useRouter();

  const now = new Date();
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [notes, setNotes] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([newPrize()]);

  const fetchData = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [qRes, iRes] = await Promise.all([
        fetch("/api/admin/queue"),
        fetch("/api/admin/giveaway-items"),
      ]);
      const [qData, iData] = await Promise.all([qRes.json(), iRes.json()]);
      if (qData.queue) {
        const sorted = [...qData.queue].sort((a: QueueMember, b: QueueMember) => {
          if (a.hasReceivedGiveaway !== b.hasReceivedGiveaway)
            return a.hasReceivedGiveaway ? 1 : -1;
          return a.queuePosition - b.queuePosition;
        });
        setQueue(sorted);
      }
      if (iData.items) setCatalog(iData.items);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  function addPrize() {
    setPrizes((p) => [...p, newPrize()]);
  }

  function removePrize(id: string) {
    setPrizes((p) => p.filter((x) => x.id !== id));
  }

  function updatePrize(id: string, field: keyof Omit<Prize, "id">, value: string) {
    setPrizes((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  function reset() {
    setTitle("");
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setNotes("");
    setPrizes([newPrize()]);
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!title.trim()) { setServerError("Title is required"); return; }
    if (prizes.length === 0) { setServerError("Add at least one prize"); return; }

    for (const p of prizes) {
      if (!p.itemName.trim()) { setServerError("Every prize needs an item name"); return; }
      if (!p.memberId) { setServerError("Every prize needs a winner selected"); return; }
    }

    setSubmitting(true);
    let result: { error?: string } = {};
    try {
      result = await createGiveaway({
        title: title.trim(),
        month,
        year,
        notes: notes.trim(),
        recipients: prizes.map((p) => ({
          memberId: p.memberId,
          itemName: p.itemName.trim(),
          itemValue: parseFloat(p.itemValue) || 0,
        })),
      });
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Gift className="h-4 w-4 mr-2" />
          New Giveaway
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Giveaway</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. June 2026 Giveaway"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Month / Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                min={2020}
                max={2099}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
              />
            </div>
          </div>

          {/* Prizes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Prizes
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({prizes.length})
                </span>
              </Label>
            </div>

            {loadingQueue ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading queue...
              </div>
            ) : (
              <div className="space-y-3">
                {prizes.map((prize, i) => (
                  <div key={prize.id} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        Prize {i + 1}
                      </div>
                      {prizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrize(prize.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs">Item</Label>
                        {catalog.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1">
                            No items in catalog.{" "}
                            <a href="/admin/giveaway-items" target="_blank" className="underline text-primary">Add items first →</a>
                          </p>
                        ) : (
                          <Select
                            value={prize.itemName}
                            onValueChange={(v) => {
                              const found = catalog.find((c) => c.name === v);
                              updatePrize(prize.id, "itemName", v);
                              if (found && found.estimatedValue > 0) {
                                updatePrize(prize.id, "itemValue", String(found.estimatedValue));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select an item…" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalog.map((item) => (
                                <SelectItem key={item._id} value={item.name}>
                                  {item.name}
                                  {item.estimatedValue > 0 && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                      Rs. {item.estimatedValue.toLocaleString()}
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Estimated value{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rs.</span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={prize.itemValue}
                            onChange={(e) => updatePrize(prize.id, "itemValue", e.target.value)}
                            className="h-8 text-sm pl-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Winner</Label>
                        {queue.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No queue members</p>
                        ) : (
                          <Select
                            value={prize.memberId}
                            onValueChange={(v) => updatePrize(prize.id, "memberId", v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Pick winner…" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const pending = queue.filter((m) => !m.hasReceivedGiveaway);
                                const received = queue.filter((m) => m.hasReceivedGiveaway);
                                return (
                                  <>
                                    {pending.length > 0 && (
                                      <SelectGroup>
                                        <SelectLabel>Up next</SelectLabel>
                                        {pending.map((m) => (
                                          <SelectItem key={m._id} value={m._id}>
                                            <span className="font-medium">#{m.queuePosition}</span>
                                            <span className="ml-1.5">— {m.name}</span>
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                    {pending.length > 0 && received.length > 0 && <SelectSeparator />}
                                    {received.length > 0 && (
                                      <SelectGroup>
                                        <SelectLabel>Already received (next cycle)</SelectLabel>
                                        {received.map((m) => (
                                          <SelectItem key={m._id} value={m._id}>
                                            <span className="font-medium">#{m.queuePosition}</span>
                                            <span className="ml-1.5 text-muted-foreground">— {m.name}</span>
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                  </>
                                );
                              })()}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPrize}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another prize
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="Any additional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {serverError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/8 ring-1 ring-destructive/20 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingQueue}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {submitting ? "Creating…" : "Create Giveaway"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
