"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckboxField,
  TextField,
  NumberField,
  SelectField,
  TextAreaField,
} from "@/components/form-fields";
import {
  REV_SHARE_PAYEE_TYPE_OPTIONS,
  REV_SHARE_PAYEE_TYPE_LABELS,
  REV_SHARE_BASIS_OPTIONS,
} from "@/lib/enums";
import { formatNumber, formatUsd, formatPercent } from "@/lib/utils";
import { computePayouts } from "@/lib/revenue-share";
import type {
  RevSharePayeeType,
  RevShareBasis,
  RevenueSharePayee,
} from "@prisma/client";
import {
  ensureChannelPartnerSeason,
  updateChannelPartnerSeason,
  addPayee,
  updatePayee,
  deletePayee,
} from "../actions";
import type { VolumeAgg } from "@/lib/rollups";
import {
  ClientFormDialog,
  type MillOption,
  type RegionOption,
} from "@/app/(app)/clients/client-form-dialog";
import { Plus as PlusIcon } from "lucide-react";

type ClientLine = {
  clientId: string;
  name: string;
  deliveredAcres: number | null;
  amount: number | null;
  currentStageShort: string;
  paymentDone: boolean;
};

type PrevCompliance = {
  seasonLabel: string;
  agreementSigned: boolean;
  w8Provided: boolean;
  bankDetails: boolean;
};

export function CpDetail({
  cpId,
  cpName,
  cpTypeLabel,
  countryLabel,
  seasonId,
  seasonLabel,
  cpSeason,
  prevCompliance,
  agg,
  payees,
  clients,
  mills,
  regions,
}: {
  cpId: string;
  cpName: string;
  cpTypeLabel: string;
  countryLabel: string;
  seasonId: string;
  seasonLabel: string;
  cpSeason: {
    id: string;
    agreementSigned: boolean;
    w8Provided: boolean;
    bankDetails: boolean;
    paymentDone: boolean;
    agreementComments: string | null;
  } | null;
  prevCompliance: PrevCompliance | null;
  agg: VolumeAgg;
  payees: RevenueSharePayee[];
  clients: ClientLine[];
  mills: MillOption[];
  regions: RegionOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [growerOpen, setGrowerOpen] = useState(false);

  if (!cpSeason) {
    return (
      <Wrapper cpName={cpName} cpTypeLabel={cpTypeLabel} countryLabel={countryLabel} reportHref={`/report/cp/${cpId}?season=${seasonId}`}>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {cpName} has no record for {seasonLabel} yet.
            </p>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await ensureChannelPartnerSeason(cpId, seasonId);
                  router.refresh();
                })
              }
            >
              Set up {cpName} for {seasonLabel}
            </Button>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  const { payouts, total } = computePayouts(payees, agg.growerPayments);

  return (
    <Wrapper cpName={cpName} cpTypeLabel={cpTypeLabel} countryLabel={countryLabel} reportHref={`/report/cp/${cpId}?season=${seasonId}`}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compliance */}
        <ComplianceCard
          cpSeason={cpSeason}
          prevCompliance={prevCompliance}
          seasonLabel={seasonLabel}
          onSaved={() => router.refresh()}
        />

        {/* Volumes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volumes — {seasonLabel}</CardTitle>
            <CardDescription>Rolled up from clients under this CP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Stat label="Clients" value={formatNumber(agg.clientCount)} />
            <Stat
              label="Enrolled (ha / ac)"
              value={`${formatNumber(agg.enrolledHectares)} / ${formatNumber(agg.enrolledAcres)}`}
            />
            <Stat
              label="Delivered (ha / ac)"
              value={`${formatNumber(agg.deliveredHectares)} / ${formatNumber(agg.deliveredAcres)}`}
            />
            <Stat label="tCO₂e" value={formatNumber(agg.tCO2e, 1)} />
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financials — {seasonLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Stat label="Grower payments" value={formatUsd(agg.growerPayments)} />
            <Stat label="Paid" value={formatUsd(agg.paidAmount)} />
            <Stat
              label="Outstanding"
              value={formatUsd(agg.growerPayments - agg.paidAmount)}
            />
            <div className="border-t pt-2">
              <Stat
                label="Total rev-share payout"
                value={formatUsd(total)}
                strong
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue share */}
      <RevShareCard
        cpSeasonId={cpSeason.id}
        payees={payees}
        payouts={payouts}
        total={total}
        growerPayments={agg.growerPayments}
        onChanged={() => router.refresh()}
      />

      {/* Clients under CP */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            Growers under this Channel Partner — {seasonLabel}
          </CardTitle>
          <Button size="sm" onClick={() => setGrowerOpen(true)}>
            <PlusIcon className="h-4 w-4" /> New grower
          </Button>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients enrolled under this CP for {seasonLabel}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Current stage</TableHead>
                  <TableHead className="text-right">Delivered ac</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.clientId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${c.clientId}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{c.currentStageShort}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.deliveredAcres)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(c.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.paymentDone ? "✓" : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={growerOpen}
        onOpenChange={setGrowerOpen}
        channelPartners={[]}
        mills={mills}
        regions={regions}
        seasonId={seasonId}
        lockedChannelPartnerId={cpId}
      />
    </Wrapper>
  );
}

function Wrapper({
  cpName,
  cpTypeLabel,
  countryLabel,
  reportHref,
  children,
}: {
  cpName: string;
  cpTypeLabel: string;
  countryLabel: string;
  reportHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href="/channel-partners">
              <ArrowLeft className="h-4 w-4" /> Channel Partners
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{cpName}</h1>
            <Badge variant="secondary">{cpTypeLabel}</Badge>
            <span className="text-sm text-muted-foreground">
              {countryLabel}
            </span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={reportHref} target="_blank">
            <FileText className="h-4 w-4" /> Partner report
          </Link>
        </Button>
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "tabular-nums"}>{value}</span>
    </div>
  );
}

/** "On file last season, not yet this season" reminder under a checkbox. */
function PrevHint({
  show,
  seasonLabel,
  what,
}: {
  show: boolean;
  seasonLabel: string;
  what: string;
}) {
  if (!show) return null;
  return (
    <p className="-mt-1 pl-6 text-xs text-amber-600 dark:text-amber-500">
      {what} was on file for {seasonLabel} — collect it again for this season.
    </p>
  );
}

function ComplianceCard({
  cpSeason,
  prevCompliance,
  seasonLabel,
  onSaved,
}: {
  cpSeason: {
    id: string;
    agreementSigned: boolean;
    w8Provided: boolean;
    bankDetails: boolean;
    paymentDone: boolean;
    agreementComments: string | null;
  };
  prevCompliance: PrevCompliance | null;
  seasonLabel: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    agreementSigned: cpSeason.agreementSigned,
    w8Provided: cpSeason.w8Provided,
    bankDetails: cpSeason.bankDetails,
    paymentDone: cpSeason.paymentDone,
    agreementComments: cpSeason.agreementComments ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compliance — {seasonLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <CheckboxField
          label="CP Agreement signed"
          checked={form.agreementSigned}
          onChange={(v) => setForm((f) => ({ ...f, agreementSigned: v }))}
        />
        <PrevHint
          show={
            !!prevCompliance?.agreementSigned && !form.agreementSigned
          }
          seasonLabel={prevCompliance?.seasonLabel ?? ""}
          what="An agreement"
        />
        <CheckboxField
          label="W-8 provided"
          checked={form.w8Provided}
          onChange={(v) => setForm((f) => ({ ...f, w8Provided: v }))}
        />
        <PrevHint
          show={!!prevCompliance?.w8Provided && !form.w8Provided}
          seasonLabel={prevCompliance?.seasonLabel ?? ""}
          what="A W-8"
        />
        <CheckboxField
          label="Bank details"
          checked={form.bankDetails}
          onChange={(v) => setForm((f) => ({ ...f, bankDetails: v }))}
        />
        <PrevHint
          show={!!prevCompliance?.bankDetails && !form.bankDetails}
          seasonLabel={prevCompliance?.seasonLabel ?? ""}
          what="Bank details"
        />
        <CheckboxField
          label="Payment done"
          checked={form.paymentDone}
          onChange={(v) => setForm((f) => ({ ...f, paymentDone: v }))}
        />
        <TextAreaField
          label="Agreement comments"
          value={form.agreementComments}
          onChange={(v) => setForm((f) => ({ ...f, agreementComments: v }))}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await updateChannelPartnerSeason(cpSeason.id, {
                agreementSigned: form.agreementSigned,
                w8Provided: form.w8Provided,
                bankDetails: form.bankDetails,
                paymentDone: form.paymentDone,
                agreementComments: form.agreementComments || null,
              });
              if (!res.ok) setError(res.error);
              else onSaved();
            })
          }
        >
          {pending ? "Saving…" : "Save compliance"}
        </Button>
      </CardContent>
    </Card>
  );
}

const emptyPayee = {
  name: "",
  payeeType: "CP" as RevSharePayeeType,
  basis: "PERCENTAGE" as RevShareBasis,
  rate: "",
  notes: "",
};

function RevShareCard({
  cpSeasonId,
  payees,
  payouts,
  total,
  growerPayments,
  onChanged,
}: {
  cpSeasonId: string;
  payees: RevenueSharePayee[];
  payouts: { payee: RevenueSharePayee; payout: number }[];
  total: number;
  growerPayments: number;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPayee);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyPayee);
    setError(null);
    setOpen(true);
  }
  function openEdit(p: RevenueSharePayee) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      payeeType: p.payeeType,
      basis: p.basis,
      // Percentage stored as decimal; show as percent for editing.
      rate:
        p.basis === "PERCENTAGE" ? String(p.rate * 100) : String(p.rate),
      notes: p.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }
  function submit() {
    setError(null);
    const rateNum = form.rate === "" ? 0 : Number(form.rate);
    const payload = {
      name: form.name,
      payeeType: form.payeeType,
      basis: form.basis,
      rate: form.basis === "PERCENTAGE" ? rateNum / 100 : rateNum,
      notes: form.notes || null,
    };
    startTransition(async () => {
      const res = editingId
        ? await updatePayee(editingId, payload)
        : await addPayee(cpSeasonId, payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      onChanged();
    });
  }
  function onDelete(id: string) {
    if (!confirm("Remove this payee?")) return;
    startTransition(async () => {
      const res = await deletePayee(id);
      if (!res.ok) alert(res.error);
      else onChanged();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Revenue share</CardTitle>
          <CardDescription>
            One or more payees on the grower-payment pool of{" "}
            {formatUsd(growerPayments)}.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add payee
        </Button>
      </CardHeader>
      <CardContent>
        {payees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payees configured. Add a CP or Referrer payee.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map(({ payee: p, payout }) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name}
                    {p.notes && (
                      <div className="text-xs text-muted-foreground">
                        {p.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{REV_SHARE_PAYEE_TYPE_LABELS[p.payeeType]}</TableCell>
                  <TableCell>
                    {p.basis === "PERCENTAGE" ? "Percentage" : "Fixed amount"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.basis === "PERCENTAGE"
                      ? formatPercent(p.rate, 2)
                      : formatUsd(p.rate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(payout)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatUsd(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit payee" : "Add payee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              label="Payee name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Payee type"
                value={form.payeeType}
                onChange={(v) =>
                  setForm((f) => ({ ...f, payeeType: v as RevSharePayeeType }))
                }
                options={REV_SHARE_PAYEE_TYPE_OPTIONS}
              />
              <SelectField
                label="Basis"
                value={form.basis}
                onChange={(v) =>
                  setForm((f) => ({ ...f, basis: v as RevShareBasis }))
                }
                options={REV_SHARE_BASIS_OPTIONS}
              />
            </div>
            <NumberField
              label={
                form.basis === "PERCENTAGE"
                  ? "Rate (%)"
                  : "Fixed amount (USD)"
              }
              value={form.rate}
              onChange={(v) => setForm((f) => ({ ...f, rate: v }))}
              placeholder={form.basis === "PERCENTAGE" ? "e.g. 6" : "e.g. 5000"}
            />
            <TextAreaField
              label="Notes (e.g. first-year or new-buyer bonus)"
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
    </Card>
  );
}
