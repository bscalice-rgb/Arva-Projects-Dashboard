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
import { TextField, SelectField } from "@/components/form-fields";
import { CROP_OPTIONS, COUNTRY_OPTIONS, MILL_CROPS } from "@/lib/enums";
import type { Country, Crop } from "@prisma/client";
import { createClient, updateClient } from "./actions";

export type OrgNodeOption = { id: string; name: string; country: Country };
export type MillOption = { id: string; name: string; crop: Crop };

export type ClientIdentity = {
  id: string;
  orgNodeId: string;
  name: string;
  legalEntity: string | null;
  country: Country;
  defaultCrop: Crop;
  millId: string | null;
  region: string | null;
};

const emptyForm = {
  orgNodeId: "",
  name: "",
  legalEntity: "",
  country: "" as Country | "",
  defaultCrop: "CORN" as Crop,
  millId: "",
  region: "",
};

export function ClientFormDialog({
  open,
  onOpenChange,
  orgNodes,
  mills,
  seasonId,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgNodes: OrgNodeOption[];
  mills: MillOption[];
  seasonId: string | null;
  editing?: ClientIdentity | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() =>
    editing
      ? {
          orgNodeId: editing.orgNodeId,
          name: editing.name,
          legalEntity: editing.legalEntity ?? "",
          country: editing.country,
          defaultCrop: editing.defaultCrop,
          millId: editing.millId ?? "",
          region: editing.region ?? "",
        }
      : emptyForm,
  );

  // Reset form whenever the dialog opens with a (possibly different) target.
  const [lastKey, setLastKey] = useState<string>("");
  const key = `${open}:${editing?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    setError(null);
    setForm(
      editing
        ? {
            orgNodeId: editing.orgNodeId,
            name: editing.name,
            legalEntity: editing.legalEntity ?? "",
            country: editing.country,
            defaultCrop: editing.defaultCrop,
            millId: editing.millId ?? "",
            region: editing.region ?? "",
          }
        : emptyForm,
    );
  }

  const showMill = MILL_CROPS.includes(form.defaultCrop);

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        orgNodeId: form.orgNodeId,
        name: form.name,
        legalEntity: form.legalEntity || null,
        country: form.country || undefined,
        defaultCrop: form.defaultCrop,
        millId: showMill ? form.millId || null : null,
        region: form.region || null,
      };
      const res = editing
        ? await updateClient(editing.id, payload)
        : await createClient(payload, seasonId ?? undefined);
      if (!res.ok) return setError(res.error);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the stable identity for this grower."
              : "Create a grower identity under an Org Node. It is added to the current season."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <SelectField
            label="Org Node"
            required
            value={form.orgNodeId || undefined}
            onChange={(v) => setForm((f) => ({ ...f, orgNodeId: v }))}
            options={orgNodes.map((o) => ({ value: o.id, label: o.name }))}
            placeholder={orgNodes.length ? "Select Org Node" : "Create one first"}
          />
          <TextField
            label="Client / grower name"
            required
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <TextField
            label="Legal entity (must match the W-8)"
            value={form.legalEntity}
            onChange={(v) => setForm((f) => ({ ...f, legalEntity: v }))}
            placeholder="Formal name used in the contract"
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Country"
              required
              value={form.country || undefined}
              onChange={(v) => setForm((f) => ({ ...f, country: v as Country }))}
              options={COUNTRY_OPTIONS}
            />
            <SelectField
              label="Default crop"
              value={form.defaultCrop}
              onChange={(v) =>
                setForm((f) => ({ ...f, defaultCrop: v as Crop }))
              }
              options={CROP_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Region / Province"
              value={form.region}
              onChange={(v) => setForm((f) => ({ ...f, region: v }))}
            />
            {showMill && (
              <SelectField
                label="Mill / Refinery"
                value={form.millId || undefined}
                onChange={(v) => setForm((f) => ({ ...f, millId: v }))}
                includeEmpty
                emptyLabel="None"
                options={mills
                  .filter((m) => m.crop === form.defaultCrop)
                  .map((m) => ({ value: m.id, label: m.name }))}
              />
            )}
          </div>
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
