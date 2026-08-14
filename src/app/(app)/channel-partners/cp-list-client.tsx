"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Pencil, Download } from "lucide-react";
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
import { BoolBadge } from "@/components/bool-badge";
import {
  TextField,
  SelectField,
  TextAreaField,
} from "@/components/form-fields";
import {
  CHANNEL_PARTNER_TYPE_OPTIONS,
  CHANNEL_PARTNER_TYPE_LABELS,
  COUNTRY_OPTIONS,
  COUNTRY_LABELS,
} from "@/lib/enums";
import { formatNumber, formatUsd } from "@/lib/utils";
import { toCsv, downloadCsv, type CsvColumn } from "@/lib/csv";
import type { ChannelPartnerType, Country } from "@prisma/client";
import { createChannelPartner, updateChannelPartner } from "./actions";

export type CpRow = {
  id: string;
  entityName: string;
  mainContact: string | null;
  type: ChannelPartnerType;
  country: Country;
  notes: string | null;
  hasSeason: boolean;
  agreementSigned: boolean;
  w8Provided: boolean;
  bankDetails: boolean;
  clientCount: number;
  deliveredAcres: number;
  growerPayments: number;
  revSharePayout: number;
};

const empty = {
  entityName: "",
  mainContact: "",
  type: "CHANNEL_PARTNER" as ChannelPartnerType,
  country: "" as Country | "",
  notes: "",
};

export function CpListClient({
  rows,
  seasonLabel,
}: {
  rows: CpRow[];
  seasonLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");
  const [compliance, setCompliance] = useState(""); // "", "complete", "incomplete"

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }
  function openEdit(r: CpRow) {
    setEditingId(r.id);
    setForm({
      entityName: r.entityName,
      mainContact: r.mainContact ?? "",
      type: r.type,
      country: r.country,
      notes: r.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }
  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        entityName: form.entityName,
        mainContact: form.mainContact || null,
        type: form.type,
        country: form.country || undefined,
        notes: form.notes || null,
      };
      const res = editingId
        ? await updateChannelPartner(editingId, payload)
        : await createChannelPartner(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        search &&
        !r.entityName.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (country && r.country !== country) return false;
      if (type && r.type !== type) return false;
      const compliant = r.agreementSigned && r.w8Provided && r.bankDetails;
      if (compliance === "complete" && !compliant) return false;
      if (compliance === "incomplete" && compliant) return false;
      return true;
    });
  }, [rows, search, country, type, compliance]);

  function exportCsv() {
    const cols: CsvColumn<CpRow>[] = [
      { header: "Channel Partner", value: (r) => r.entityName },
      { header: "Type", value: (r) => CHANNEL_PARTNER_TYPE_LABELS[r.type] },
      { header: "Country", value: (r) => COUNTRY_LABELS[r.country] },
      { header: "Main contact", value: (r) => r.mainContact },
      { header: "Agreement signed", value: (r) => (r.agreementSigned ? "Y" : "N") },
      { header: "W8 provided", value: (r) => (r.w8Provided ? "Y" : "N") },
      { header: "Bank details", value: (r) => (r.bankDetails ? "Y" : "N") },
      { header: "Clients", value: (r) => r.clientCount },
      { header: "Delivered ac", value: (r) => Math.round(r.deliveredAcres) },
      { header: "Grower payments USD", value: (r) => Math.round(r.growerPayments) },
      { header: "Rev-share payout USD", value: (r) => Math.round(r.revSharePayout) },
    ];
    downloadCsv(
      `channel-partners-${seasonLabel.replace(/\s+/g, "-").toLowerCase()}.csv`,
      toCsv(filtered, cols),
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          label=""
          value={country || undefined}
          onChange={setCountry}
          options={COUNTRY_OPTIONS}
          includeEmpty
          emptyLabel="All countries"
          placeholder="All countries"
        />
        <SelectField
          label=""
          value={type || undefined}
          onChange={setType}
          options={CHANNEL_PARTNER_TYPE_OPTIONS}
          includeEmpty
          emptyLabel="All types"
          placeholder="All types"
        />
        <SelectField
          label=""
          value={compliance || undefined}
          onChange={setCompliance}
          options={[
            { value: "complete", label: "Compliance complete" },
            { value: "incomplete", label: "Compliance incomplete" },
          ]}
          includeEmpty
          emptyLabel="All compliance"
          placeholder="All compliance"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length} · {seasonLabel}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Channel Partner
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Channel Partners"
          description="Register CPs and Referrers, their compliance status and per-season revenue-share terms."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Channel Partner
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
                <TableHead>Country</TableHead>
                <TableHead className="text-center">Agreement</TableHead>
                <TableHead className="text-center">W-8</TableHead>
                <TableHead className="text-center">Bank</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">Delivered ac</TableHead>
                <TableHead className="text-right">Grower pmts</TableHead>
                <TableHead className="text-right">Rev-share</TableHead>
                <TableHead className="w-[44px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/channel-partners/${r.id}`}
                        className="hover:underline"
                      >
                        {r.entityName}
                      </Link>
                      {!r.hasSeason && (
                        <Badge variant="outline" className="text-[10px]">
                          Not in {seasonLabel}
                        </Badge>
                      )}
                    </span>
                    {r.mainContact && (
                      <div className="text-xs text-muted-foreground">
                        {r.mainContact}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.type === "REFERRER" ? "outline" : "secondary"}
                    >
                      {CHANNEL_PARTNER_TYPE_LABELS[r.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{COUNTRY_LABELS[r.country]}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <BoolBadge value={r.agreementSigned} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <BoolBadge value={r.w8Provided} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <BoolBadge value={r.bankDetails} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.clientCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.deliveredAcres)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(r.growerPayments)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(r.revSharePayout)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
              {editingId ? "Edit Channel Partner" : "New Channel Partner"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              label="Entity name"
              required
              value={form.entityName}
              onChange={(v) => setForm((f) => ({ ...f, entityName: v }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Type"
                value={form.type}
                onChange={(v) =>
                  setForm((f) => ({ ...f, type: v as ChannelPartnerType }))
                }
                options={CHANNEL_PARTNER_TYPE_OPTIONS}
              />
              <SelectField
                label="Country"
                required
                value={form.country || undefined}
                onChange={(v) =>
                  setForm((f) => ({ ...f, country: v as Country }))
                }
                options={COUNTRY_OPTIONS}
              />
            </div>
            <TextField
              label="Main contact"
              value={form.mainContact}
              onChange={(v) => setForm((f) => ({ ...f, mainContact: v }))}
            />
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
