"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Network, Plus, Pencil, Trash2 } from "lucide-react";
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
import { TextField, SelectField } from "@/components/form-fields";
import {
  ORG_NODE_KIND_OPTIONS,
  ORG_NODE_KIND_LABELS,
  COUNTRY_OPTIONS,
  COUNTRY_LABELS,
} from "@/lib/enums";
import type { OrgNodeKind, Country } from "@prisma/client";
import { createOrgNode, updateOrgNode, deleteOrgNode } from "./actions";

type OrgNodeRow = {
  id: string;
  name: string;
  kind: OrgNodeKind;
  country: Country;
  channelPartnerId: string | null;
  channelPartnerName: string | null;
  clientCount: number;
};

type CpOption = { id: string; entityName: string };

const empty = {
  name: "",
  kind: "DIRECT_GROWER" as OrgNodeKind,
  country: "" as Country | "",
  channelPartnerId: "",
};

export function OrgNodesClient({
  orgNodes,
  channelPartners,
}: {
  orgNodes: OrgNodeRow[];
  channelPartners: CpOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }

  function openEdit(row: OrgNodeRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      kind: row.kind,
      country: row.country,
      channelPartnerId: row.channelPartnerId ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: form.name,
        kind: form.kind,
        country: form.country || undefined,
        channelPartnerId: form.channelPartnerId || null,
      };
      const res = editingId
        ? await updateOrgNode(editingId, payload)
        : await createOrgNode(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete(row: OrgNodeRow) {
    if (!confirm(`Delete Org Node "${row.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteOrgNode(row.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  const filtered = orgNodes.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search org nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Org Node
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No Org Nodes"
          description="An Org Node is the top-level CropForce repository — a Channel Partner or a direct grower."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Org Node
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Channel Partner</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        n.kind === "CHANNEL_PARTNER" ? "secondary" : "muted"
                      }
                    >
                      {ORG_NODE_KIND_LABELS[n.kind]}
                    </Badge>
                  </TableCell>
                  <TableCell>{COUNTRY_LABELS[n.country]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {n.channelPartnerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{n.clientCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(n)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(n)}
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
              {editingId ? "Edit Org Node" : "New Org Node"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              label="Name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="CropForce Org Node name"
            />
            <SelectField
              label="Kind"
              required
              value={form.kind}
              onChange={(v) =>
                setForm((f) => ({ ...f, kind: v as OrgNodeKind }))
              }
              options={ORG_NODE_KIND_OPTIONS}
            />
            <SelectField
              label="Country"
              required
              value={form.country || undefined}
              onChange={(v) => setForm((f) => ({ ...f, country: v as Country }))}
              options={COUNTRY_OPTIONS}
            />
            {form.kind === "CHANNEL_PARTNER" && (
              <SelectField
                label="Channel Partner"
                required
                value={form.channelPartnerId || undefined}
                onChange={(v) =>
                  setForm((f) => ({ ...f, channelPartnerId: v }))
                }
                options={channelPartners.map((cp) => ({
                  value: cp.id,
                  label: cp.entityName,
                }))}
                placeholder={
                  channelPartners.length
                    ? "Select CP"
                    : "No Channel Partners yet"
                }
              />
            )}
            {form.kind === "CHANNEL_PARTNER" &&
              channelPartners.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Create a{" "}
                  <Link
                    href="/channel-partners"
                    className="underline underline-offset-2"
                  >
                    Channel Partner
                  </Link>{" "}
                  first to link it here.
                </p>
              )}
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
