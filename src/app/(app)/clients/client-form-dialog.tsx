"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  TextField,
  SelectField,
  MultiSelectField,
} from "@/components/form-fields";
import { CROP_OPTIONS, COUNTRY_OPTIONS, MILL_CROPS } from "@/lib/enums";
import type { Country, Crop } from "@prisma/client";
import { createClient, updateClient } from "./actions";

export type CpOption = { id: string; entityName: string };
export type MillOption = { id: string; name: string; crop: Crop };
export type RegionOption = { id: string; name: string; country: Country };

export type ClientIdentity = {
  id: string;
  // The Channel Partner this grower is enrolled under; null = direct grower.
  channelPartnerId: string | null;
  name: string;
  legalEntity: string | null;
  country: Country;
  defaultCrops: Crop[];
  millId: string | null;
  regionIds: string[];
};

const DIRECT = "__direct__";

function initialForm(editing?: ClientIdentity | null, lockedCp?: string | null) {
  return {
    channel: lockedCp ?? editing?.channelPartnerId ?? DIRECT,
    name: editing?.name ?? "",
    legalEntity: editing?.legalEntity ?? "",
    country: (editing?.country ?? "") as Country | "",
    defaultCrops: (editing?.defaultCrops ?? []) as string[],
    millId: editing?.millId ?? "",
    regionIds: (editing?.regionIds ?? []) as string[],
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  channelPartners,
  mills,
  regions,
  seasonId,
  editing,
  lockedChannelPartnerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channelPartners: CpOption[];
  mills: MillOption[];
  regions: RegionOption[];
  seasonId: string | null;
  editing?: ClientIdentity | null;
  lockedChannelPartnerId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() =>
    initialForm(editing, lockedChannelPartnerId),
  );

  const [lastKey, setLastKey] = useState<string>("");
  const key = `${open}:${editing?.id ?? "new"}:${lockedChannelPartnerId ?? ""}`;
  if (key !== lastKey) {
    setLastKey(key);
    setError(null);
    setForm(initialForm(editing, lockedChannelPartnerId));
  }

  const showMill = form.defaultCrops.some((c) =>
    MILL_CROPS.includes(c as Crop),
  );
  const regionOptions = regions
    .filter((r) => r.country === form.country)
    .map((r) => ({ value: r.id, label: r.name }));

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        channelPartnerId: form.channel === DIRECT ? null : form.channel,
        name: form.name,
        legalEntity: form.legalEntity || null,
        country: form.country || undefined,
        defaultCrops: form.defaultCrops,
        millId: showMill ? form.millId || null : null,
        regionIds: form.regionIds,
      };
      const res = editing
        ? await updateClient(editing.id, payload)
        : await createClient(payload, seasonId ?? undefined);
      if (!res.ok) return setError(res.error);
      onOpenChange(false);
      router.refresh();
    });
  }

  const channelOptions = [
    { value: DIRECT, label: "Direct grower (no Channel Partner)" },
    ...channelPartners.map((cp) => ({ value: cp.id, label: cp.entityName })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit grower" : "New grower"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the stable identity for this grower."
              : "Add a grower under a Channel Partner (or as a direct grower). It's added to the current season."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!lockedChannelPartnerId && (
            <SelectField
              label="Enrolled under"
              required
              value={form.channel}
              onChange={(v) => setForm((f) => ({ ...f, channel: v }))}
              options={channelOptions}
            />
          )}
          <TextField
            label="Grower / common name"
            required
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <TextField
            label="Legal entity (used in the contract — must match the W-8)"
            value={form.legalEntity}
            onChange={(v) => setForm((f) => ({ ...f, legalEntity: v }))}
            placeholder="Formal legal name"
          />
          <SelectField
            label="Country"
            required
            value={form.country || undefined}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                country: v as Country,
                regionIds: [], // regions depend on country
              }))
            }
            options={COUNTRY_OPTIONS}
          />
          <MultiSelectField
            label="Crops"
            options={CROP_OPTIONS}
            selected={form.defaultCrops}
            onChange={(v) => setForm((f) => ({ ...f, defaultCrops: v }))}
          />
          <MultiSelectField
            label="Regions / states"
            options={regionOptions}
            selected={form.regionIds}
            onChange={(v) => setForm((f) => ({ ...f, regionIds: v }))}
            emptyHint={
              form.country
                ? "No regions set up for this country yet — add them under Seasons → Countries & Regions."
                : "Pick a country first."
            }
          />
          {showMill && (
            <SelectField
              label="Mill / Refinery"
              value={form.millId || undefined}
              onChange={(v) => setForm((f) => ({ ...f, millId: v }))}
              includeEmpty
              emptyLabel="None"
              options={mills
                .filter((m) => form.defaultCrops.includes(m.crop))
                .map((m) => ({ value: m.id, label: m.name }))}
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
