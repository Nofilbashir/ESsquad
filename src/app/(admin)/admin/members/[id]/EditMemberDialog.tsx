"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateMemberSchema, type UpdateMemberInput } from "@/schemas/member";
import { updateMember } from "@/actions/members";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface Props {
  member: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
  };
}

export default function EditMemberDialog({ member }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      name: member.name,
      phone: member.phone,
      email: member.email,
      status: member.status,
    },
  });

  async function onSubmit(data: UpdateMemberInput) {
    setServerError(null);
    const formData = new FormData();
    if (data.name) formData.set("name", data.name);
    if (data.phone) formData.set("phone", data.phone);
    if (data.email) formData.set("email", data.email);
    if (data.status) formData.set("status", data.status);

    const result = await updateMember(member._id, formData);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setServerError(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input id="edit-phone" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input id="edit-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              defaultValue={member.status}
              onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {serverError}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
