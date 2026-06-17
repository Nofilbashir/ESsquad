"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettingsSchema, type UpdateSettingsInput } from "@/schemas/settings";
import { updateSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { useEffect } from "react";

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
  });

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) {
          reset({
            communityName: d.stats.communityName,
            monthlyFee: d.stats.monthlyFee,
            currency: "Rs.",
          });
        }
      });
  }, [reset]);

  const onSubmit = async (data: UpdateSettingsInput) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await updateSettings(data);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Community Settings</CardTitle>
          <CardDescription>
            Changes to monthly fee apply to future contribution records only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="communityName">Community Name</Label>
              <Input id="communityName" {...register("communityName")} />
              {errors.communityName && (
                <p className="text-sm text-destructive">{errors.communityName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyFee">Monthly Fee</Label>
              <Input
                id="monthlyFee"
                type="number"
                min={1}
                {...register("monthlyFee", { valueAsNumber: true })}
              />
              {errors.monthlyFee && (
                <p className="text-sm text-destructive">{errors.monthlyFee.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency Symbol</Label>
              <Input id="currency" {...register("currency")} />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 text-sm dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" /> Settings saved successfully
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
