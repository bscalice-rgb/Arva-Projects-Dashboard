"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Factory, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { TextField, SelectField, TextAreaField } from "@/components/form-fields";
import {
  MILL_TYPE_OPTIONS,
  MILL_TYPE_LABELS,
  CROP_OPTIONS,
  CROP_LABELS,
  COUNTRY_OPTIONS,
  COUNTRY_LABELS,
} from "@/lib/enums";
import type { MillType, Crop, Country } from "@prisma/client";
import { createMill, updateMill, deleteMill } from "./actions";

type MillRow = {
  id: string;
  name: string;
  type: MillType;
  crop: Crop;
  country: Country;
  region: string | null;
  notes: string | null;
  clientCount: number;
};

const empty = {
  name: "",
  type: "MILL" as MillType,
  crop: "SUGARCANE" as Crop,
  country: "" as Country | "",
  region: "",
  notes: "",
};

export function MillsClient({ mills }: { mills: MillRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }
  function openEdit(row: MillRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      type: row.type,
      crop: row.crop,
      country: row.country,
      region: row.region ?? "",
      notes: row.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }
  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: form.name,
        type: form.type,
        crop: form.crop,
        country: form.country || undefined,
        region: form.region || null,
        notes: form.notes || null,
      };
      const res = editingId
        ? await updateMill(editingId, payload)
        : await createMill(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }
  function onDelete(row: MillRow) {
    if (!confirm(`Delete "${row.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteMill(row.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Mill / Refinery
        </Button>
      </div>

      {mills.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No mills or refineries"
          description="Add processing facilities for sugarcane and palm; link them to clients."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Mill / Refinery
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mills.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{MILL_TYPE_LABELS[m.type]}</Badge>
                  </TableCell>
                  <TableCell>{CROP_LABELS[m.crop]}</TableCell>
                  <TableCell>{COUNTRY_LABELS[m.country]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.region ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{m.clientCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(m)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Mill / Refinery" : "New Mill / Refinery"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              label="Name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Type"
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v as MillType }))}
                options={MILL_TYPE_OPTIONS}
              />
              <SelectField
                label="Crop"
                value={form.crop}
                onChange={(v) => setForm((f) => ({ ...f, crop: v as Crop }))}
                options={CROP_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Country"
                required
                value={form.country || undefined}
                onChange={(v) =>
                  setForm((f) => ({ ...f, country: v as Country }))
                }
                options={COUNTRY_OPTIONS}
              />
              <TextField
                label="Region / Province"
                value={form.region}
                onChange={(v) => setForm((f) => ({ ...f, region: v }))}
              />
            </div>
            <TextAreaField
              label="Notes"
              value={form.notes}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
