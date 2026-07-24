"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Factory, Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  CROP_OPTIONS,
  CROP_LABELS,
  COUNTRY_OPTIONS,
  COUNTRY_LABELS,
} from "@/lib/enums";
import type { Crop, Country } from "@prisma/client";
import {
  createMill,
  updateMill,
  deleteMill,
  createMillGroup,
  updateMillGroup,
  deleteMillGroup,
} from "./actions";

type MillRow = {
  id: string;
  name: string;
  crop: Crop;
  country: Country;
  region: string | null;
  notes: string | null;
  groupId: string | null;
  clientCount: number;
};

type GroupRow = {
  id: string;
  name: string;
  country: Country | null;
  notes: string | null;
  millCount: number;
};

const emptyMill = {
  name: "",
  crop: "SUGARCANE" as Crop,
  country: "" as Country | "",
  region: "",
  groupId: "",
  notes: "",
};

const emptyGroup = {
  name: "",
  country: "" as Country | "",
  notes: "",
};

export function MillsClient({
  mills,
  groups,
}: {
  mills: MillRow[];
  groups: GroupRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Mill dialog state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMill);
  const [error, setError] = useState<string | null>(null);

  // Group dialog state
  const [groupOpen, setGroupOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [groupError, setGroupError] = useState<string | null>(null);

  function openCreate(groupId?: string) {
    setEditingId(null);
    setForm({ ...emptyMill, groupId: groupId ?? "" });
    setError(null);
    setOpen(true);
  }
  function openEdit(row: MillRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      crop: row.crop,
      country: row.country,
      region: row.region ?? "",
      groupId: row.groupId ?? "",
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
        crop: form.crop,
        country: form.country || undefined,
        region: form.region || null,
        groupId: form.groupId || null,
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

  function openCreateGroup() {
    setEditingGroupId(null);
    setGroupForm(emptyGroup);
    setGroupError(null);
    setGroupOpen(true);
  }
  function openEditGroup(g: GroupRow) {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name,
      country: g.country ?? "",
      notes: g.notes ?? "",
    });
    setGroupError(null);
    setGroupOpen(true);
  }
  function submitGroup() {
    setGroupError(null);
    startTransition(async () => {
      const payload = {
        name: groupForm.name,
        country: groupForm.country || null,
        notes: groupForm.notes || null,
      };
      const res = editingGroupId
        ? await updateMillGroup(editingGroupId, payload)
        : await createMillGroup(payload);
      if (!res.ok) return setGroupError(res.error);
      setGroupOpen(false);
      router.refresh();
    });
  }
  function onDeleteGroup(g: GroupRow) {
    if (
      !confirm(
        `Delete group "${g.name}"? Its mills are kept and become ungrouped.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteMillGroup(g.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  // Group > Mill/Refinery hierarchy: groups (with their mills) first, then ungrouped.
  const grouped = useMemo(() => {
    const byGroup = new Map<string, MillRow[]>();
    const ungrouped: MillRow[] = [];
    for (const m of mills) {
      if (m.groupId && groups.some((g) => g.id === m.groupId)) {
        if (!byGroup.has(m.groupId)) byGroup.set(m.groupId, []);
        byGroup.get(m.groupId)!.push(m);
      } else {
        ungrouped.push(m);
      }
    }
    return { byGroup, ungrouped };
  }, [mills, groups]);

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  function millRow(m: MillRow, indent: boolean) {
    return (
      <TableRow key={m.id}>
        <TableCell className={indent ? "pl-10 font-medium" : "font-medium"}>
          {m.name}
        </TableCell>
        <TableCell>{CROP_LABELS[m.crop]}</TableCell>
        <TableCell>{COUNTRY_LABELS[m.country]}</TableCell>
        <TableCell className="text-muted-foreground">
          {m.region ?? "—"}
        </TableCell>
        <TableCell className="text-right">{m.clientCount}</TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(m)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={openCreateGroup}>
          <Building2 className="h-4 w-4" /> New Group
        </Button>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> New Mill / Refinery
        </Button>
      </div>

      {mills.length === 0 && groups.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No mills or refineries"
          description="Add processing facilities for sugarcane and palm; organize them under groups when one company owns several."
          action={
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" /> New Mill / Refinery
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group / Mill</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.id}>
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-semibold">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {g.name}
                        <Badge variant="muted" className="text-[10px]">
                          Group
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.millCount} mill{g.millCount === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.country ? COUNTRY_LABELS[g.country] : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.notes ?? ""}
                    </TableCell>
                    <TableCell />
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Add mill to this group"
                          onClick={() => openCreate(g.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditGroup(g)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteGroup(g)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {(grouped.byGroup.get(g.id) ?? []).map((m) =>
                    millRow(m, true),
                  )}
                </Fragment>
              ))}
              {grouped.ungrouped.length > 0 && groups.length > 0 && (
                <TableRow className="bg-muted/40">
                  <TableCell
                    colSpan={6}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Independent (no group)
                  </TableCell>
                </TableRow>
              )}
              {grouped.ungrouped.map((m) => millRow(m, groups.length > 0))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mill dialog */}
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
            <SelectField
              label="Group (company owning multiple mills)"
              value={form.groupId || undefined}
              onChange={(v) => setForm((f) => ({ ...f, groupId: v }))}
              options={groupOptions}
              includeEmpty
              emptyLabel="None — independent"
              placeholder="None — independent"
            />
            <SelectField
              label="Crop"
              value={form.crop}
              onChange={(v) => setForm((f) => ({ ...f, crop: v as Crop }))}
              options={CROP_OPTIONS}
            />
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

      {/* Group dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroupId ? "Edit Group" : "New Group"}
            </DialogTitle>
            <DialogDescription>
              A company that owns multiple mills or refineries. Assign mills to
              it from the mill form.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              label="Group / company name"
              required
              value={groupForm.name}
              onChange={(v) => setGroupForm((f) => ({ ...f, name: v }))}
            />
            <SelectField
              label="Country (optional)"
              value={groupForm.country || undefined}
              onChange={(v) =>
                setGroupForm((f) => ({ ...f, country: v as Country }))
              }
              options={COUNTRY_OPTIONS}
              includeEmpty
              emptyLabel="Not set"
            />
            <TextAreaField
              label="Notes"
              value={groupForm.notes}
              onChange={(v) => setGroupForm((f) => ({ ...f, notes: v }))}
            />
            {groupError && (
              <p className="text-sm text-destructive">{groupError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitGroup} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
