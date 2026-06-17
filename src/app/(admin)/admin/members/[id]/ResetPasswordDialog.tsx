"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetMemberPasswordSchema } from "@/schemas/member";
import { resetMemberPassword } from "@/actions/members";
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
import { KeyRound } from "lucide-react";
import { z } from "zod";

type ResetPasswordInput = z.infer<typeof resetMemberPasswordSchema>;

interface Props {
  memberId: string;
  memberName: string;
}

export default function ResetPasswordDialog({ memberId, memberName }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetMemberPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordInput) {
    setServerError(null);
    setSuccess(false);
    const result = await resetMemberPassword(memberId, data.password);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setSuccess(true);
    reset();
    router.refresh();
    setTimeout(() => setOpen(false), 1500);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          reset();
          setServerError(null);
          setSuccess(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{memberName}</strong>.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 6 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              Password reset successfully!
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || success}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
