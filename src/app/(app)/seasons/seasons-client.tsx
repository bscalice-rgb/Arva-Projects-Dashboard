"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  TextField,
  NumberField,
  SelectField,
  CheckboxField,
} from "@/components/form-fields";
import { Trash2 as TrashIcon, Plus as PlusIcon, MapPin } from "lucide-react";
import { COUNTRY_OPTIONS, COUNTRY_LABELS } from "@/lib/enums";
import type { Country } from "@prisma/client";
import {
  createSeason,
  updateSeason,
  setActiveSeason,
  deleteSeason,
  carryForward,
  createRegion,
  deleteRegion,
} from "./actions";

type RegionRow = { id: string; name: string; country: Country };

type SeasonRow = {
  id: string;
  year: number;
  label: string;
  isActive: boolean;
  clientCount: number;
  cpCount: number;
  shedCount: number;
};
type NameRef = { id: string; name: string };

export function SeasonsClient({
  seasons,
  clientsBySeason,
  cpsBySeason,
  regions,
}: {
  seasons: SeasonRow[];
  clientsBySeason: Record<string, NameRef[]>;
  cpsBySeason: Record<string, NameRef[]>;
  regions: RegionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Create / edit season
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ year: "", label: "", isActive: false });
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ year: "", label: "", isActive: seasons.length === 0 });
    setError(null);
    setOpen(true);
  }
  function openEdit(s: SeasonRow) {
    setEditingId(s.id);
    setForm({ year: String(s.year), label: s.label, isActive: s.isActive });
    setError(null);
    setOpen(true);
  }
  function submit() {
    setError(null);
    const payload = {
      year: form.year,
      label: form.label,
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateSeason(editingId, payload)
        : await createSeason(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <CarryForwardDialog
          seasons={seasons}
          clientsBySeason={clientsBySeason}
          cpsBySeason={cpsBySeason}
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New season
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program years</CardTitle>
          <CardDescription>
            The active season is the default across the app; use the switcher in
            the top bar to view another.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">CPs</TableHead>
                <TableHead className="text-right">Sheds</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.year}</TableCell>
                  <TableCell>{s.label}</TableCell>
                  <TableCell className="text-right">{s.clientCount}</TableCell>
                  <TableCell className="text-right">{s.cpCount}</TableCell>
                  <TableCell className="text-right">{s.shedCount}</TableCell>
                  <TableCell>
                    {s.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!s.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Set active"
                          onClick={() =>
                            startTransition(async () => {
                              await setActiveSeason(s.id);
                              router.refresh();
                            })
                          }
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!confirm(`Delete ${s.label}?`)) return;
                          startTransition(async () => {
                            const res = await deleteSeason(s.id);
                            if (!res.ok) alert(res.error);
                            else router.refresh();
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RegionsManager regions={regions} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit season" : "New season"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Year"
                value={form.year}
                onChange={(v) => setForm((f) => ({ ...f, year: v }))}
                placeholder="2026"
              />
              <TextField
                label="Label"
                required
                value={form.label}
                onChange={(v) => setForm((f) => ({ ...f, label: v }))}
                placeholder="2026 Program Year"
              />
            </div>
            <CheckboxField
              label="Set as active season"
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
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

function RegionsManager({ regions }: { regions: RegionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [country, setCountry] = useState<Country | "">("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byCountry = new Map<Country, RegionRow[]>();
  for (const r of regions) {
    if (!byCountry.has(r.country)) byCountry.set(r.country, []);
    byCountry.get(r.country)!.push(r);
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createRegion({ country: country || undefined, name });
      if (!res.ok) return setError(res.error);
      setName("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" /> Countries & Regions
        </CardTitle>
        <CardDescription>
          Set up the states/regions available for each country. Growers and
          allotments pick from this list, filtered by their country.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-56">
            <SelectField
              label="Country"
              value={country || undefined}
              onChange={(v) => setCountry(v as Country)}
              options={COUNTRY_OPTIONS}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">
              Region / state
            </label>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Riau"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                onClick={add}
                disabled={pending || !country || !name.trim()}
              >
                <PlusIcon className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {regions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No regions yet. Add the states/provinces you operate in.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...byCountry.entries()].map(([c, list]) => (
              <div key={c} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{COUNTRY_LABELS[c]}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-sm"
                    >
                      {r.name}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (!confirm(`Delete region "${r.name}"?`)) return;
                          startTransition(async () => {
                            const res = await deleteRegion(r.id);
                            if (!res.ok) alert(res.error);
                            else router.refresh();
                          });
                        }}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CarryForwardDialog({
  seasons,
  clientsBySeason,
  cpsBySeason,
}: {
  seasons: SeasonRow[];
  clientsBySeason: Record<string, NameRef[]>;
  cpsBySeason: Record<string, NameRef[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [clientIds, setClientIds] = useState<Set<string>>(new Set());
  const [cpIds, setCpIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const sourceClients = source ? clientsBySeason[source] ?? [] : [];
  const sourceCps = source ? cpsBySeason[source] ?? [] : [];

  function toggle(set: Set<string>, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function reset() {
    setSource("");
    setTarget("");
    setClientIds(new Set());
    setCpIds(new Set());
    setError(null);
    setResult(null);
  }

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await carryForward({
        sourceSeasonId: source,
        targetSeasonId: target,
        clientIds: [...clientIds],
        channelPartnerIds: [...cpIds],
      });
      if (!res.ok) return setError(res.error);
      setResult(
        `Carried forward ${res.data?.clients ?? 0} client(s) and ${
          res.data?.cps ?? 0
        } CP(s).`,
      );
      router.refresh();
    });
  }

  const seasonOptions = seasons.map((s) => ({ value: s.id, label: s.label }));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="h-4 w-4" /> Carry forward
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Carry forward to a new season</DialogTitle>
          <DialogDescription>
            Reuse existing growers and CPs. Stable identity is pre-filled; only
            the W-8 status carries over. Contract, pipeline, bank details,
            outcomes and payment reset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="From season"
              value={source || undefined}
              onChange={(v) => {
                setSource(v);
                setClientIds(new Set());
                setCpIds(new Set());
              }}
              options={seasonOptions}
              placeholder="Source"
            />
            <SelectField
              label="To season"
              value={target || undefined}
              onChange={setTarget}
              options={seasonOptions.filter((o) => o.value !== source)}
              placeholder="Target"
            />
          </div>

          {source && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectList
                title="Clients"
                items={sourceClients}
                selected={clientIds}
                onToggle={(id) => setClientIds((s) => toggle(s, id))}
                onAll={(all) =>
                  setClientIds(
                    all ? new Set(sourceClients.map((c) => c.id)) : new Set(),
                  )
                }
              />
              <SelectList
                title="Channel Partners"
                items={sourceCps}
                selected={cpIds}
                onToggle={(id) => setCpIds((s) => toggle(s, id))}
                onAll={(all) =>
                  setCpIds(
                    all ? new Set(sourceCps.map((c) => c.id)) : new Set(),
                  )
                }
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && <p className="text-sm text-success">{result}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={run}
            disabled={
              pending ||
              !source ||
              !target ||
              (clientIds.size === 0 && cpIds.size === 0)
            }
          >
            {pending ? "Working…" : "Carry forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectList({
  title,
  items,
  selected,
  onToggle,
  onAll,
}: {
  title: string;
  items: NameRef[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAll: (all: boolean) => void;
}) {
  const allSelected = items.length > 0 && selected.size === items.length;
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">
          {title} ({selected.size}/{items.length})
        </span>
        {items.length > 0 && (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onAll(!allSelected)}
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        )}
      </div>
      <div className="max-h-56 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            None in this season.
          </p>
        ) : (
          items.map((it) => (
            <label
              key={it.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-accent"
            >
              <Checkbox
                checked={selected.has(it.id)}
                onCheckedChange={() => onToggle(it.id)}
              />
              <span className="text-sm">{it.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
