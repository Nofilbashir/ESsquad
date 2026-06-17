"use client";

import { useState } from "react";
import { createGiveawayItem } from "@/actions/giveawayItems";
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
import { Plus, Loader2, AlertCircle } from "lucide-react";

export default function AddItemDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setName("");
    setDescription("");
    setEstimatedValue("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createGiveawayItem({
      name: name.trim(),
      description: description.trim(),
      estimatedValue: parseFloat(estimatedValue) || 0,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
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
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Giveaway Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Item name</Label>
            <Input
              placeholder="e.g. Ambient Lights"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Description{" "}
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="Short description of the item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Estimated value{" "}
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
