"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Download, Sprout, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PipelineProgress } from "@/components/pipeline-progress";
import { SelectField } from "@/components/form-fields";
import { InlineBool, InlineEnum } from "./inline-controls";
import {
  ClientFormDialog,
  type OrgNodeOption,
  type MillOption,
} from "./client-form-dialog";
import {
  CROP_LABELS,
  CROP_OPTIONS,
  COUNTRY_LABELS,
  COUNTRY_OPTIONS,
  DATA_STATUS_OPTIONS,
  QAQC_NPKS_OPTIONS,
  QAQC_FLAGS_OPTIONS,
  EVIDENCING_OPTIONS,
  ECC_STATUS_OPTIONS,
  W8_TYPE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
} from "@/lib/enums";
import { getPipelineStatus, PIPELINE_STAGES } from "@/lib/pipeline";
import { formatNumber, formatUsd } from "@/lib/utils";
import { toCsv, downloadCsv, type CsvColumn } from "@/lib/csv";
import type { ClientSeasonRow } from "./types";
import { patchClientSeason } from "./actions";

export function ClientsTable({
  rows: initialRows,
  orgNodes,
  mills,
  channelPartnerNames,
  seasonId,
  seasonLabel,
}: {
  rows: ClientSeasonRow[];
  orgNodes: OrgNodeOption[];
  mills: MillOption[];
  channelPartnerNames: string[];
  seasonId: string | null;
  seasonLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialRows);
  useEffect(() => setRows(initialRows), [initialRows]);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [crop, setCrop] = useState("");
  const [cp, setCp] = useState(""); // "", "__direct__", or CP name
  const [stage, setStage] = useState(""); // "", stage index as string, or "complete"
  const [payment, setPayment] = useState(""); // "", "done", "outstanding"
  const [dialogOpen, setDialogOpen] = useState(false);

  function patch(id: string, patch: Partial<ClientSeasonRow>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
    startTransition(async () => {
      const res = await patchClientSeason(id, patch);
      if (!res.ok) {
        alert(res.error);
        router.refresh();
      }
    });
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        search &&
        !`${r.clientName} ${r.legalEntity ?? ""} ${r.orgNodeName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      if (country && r.country !== country) return false;
      if (crop && r.crop !== crop) return false;
      if (cp === "__direct__" && r.orgNodeKind !== "DIRECT_GROWER") return false;
      if (cp && cp !== "__direct__" && r.channelPartnerName !== cp) return false;
      if (stage) {
        const idx = getPipelineStatus(r).stageIndex;
        if (stage === "complete") {
          if (!getPipelineStatus(r).isComplete) return false;
        } else if (idx !== Number(stage)) return false;
      }
      if (payment === "done" && !r.paymentDone) return false;
      if (payment === "outstanding" && r.paymentDone) return false;
      return true;
    });
  }, [rows, search, country, crop, cp, stage, payment]);

  function exportCsv() {
    const cols: CsvColumn<ClientSeasonRow>[] = [
      { header: "Client", value: (r) => r.clientName },
      { header: "Legal Entity", value: (r) => r.legalEntity },
      { header: "Org Node", value: (r) => r.orgNodeName },
      {
        header: "Channel Partner / Direct",
        value: (r) =>
          r.orgNodeKind === "DIRECT_GROWER"
            ? "Direct"
            : r.channelPartnerName ?? "",
      },
      { header: "Country", value: (r) => COUNTRY_LABELS[r.country] },
      { header: "Region", value: (r) => r.region },
      { header: "Crop", value: (r) => CROP_LABELS[r.crop] },
      { header: "Mill", value: (r) => r.millName },
      { header: "Enrolled ha", value: (r) => r.enrolledHectares },
      { header: "Enrolled ac", value: (r) => r.enrolledAcres },
      {
        header: "Current Stage",
        value: (r) => getPipelineStatus(r).currentStage,
      },
      {
        header: "Progress %",
        value: (r) => Math.round(getPipelineStatus(r).percentComplete * 100),
      },
      { header: "Legal entity setup", value: (r) => (r.legalEntitySetup ? "Y" : "N") },
      { header: "Data status", value: (r) => r.dataStatus },
      { header: "Field requested", value: (r) => (r.fieldRequested ? "Y" : "N") },
      { header: "QAQC NPKS", value: (r) => r.qaqcNpks },
      { header: "QAQC Flags", value: (r) => r.qaqcFlags },
      { header: "Field confirmed", value: (r) => (r.fieldConfirmed ? "Y" : "N") },
      { header: "Evidencing", value: (r) => r.evidencing },
      { header: "ECC", value: (r) => r.ecc },
      { header: "W8 type", value: (r) => r.w8Type ?? "" },
      { header: "W8 in CropForce", value: (r) => (r.w8InCropForce ? "Y" : "N") },
      { header: "W8 matches LE", value: (r) => (r.w8MatchesLegalEntity ? "Y" : "N") },
      { header: "Contract", value: (r) => r.contractStatus },
      {
        header: "Contract approved",
        value: (r) => (r.contractApprovedInCropForce ? "Y" : "N"),
      },
      { header: "Bank details", value: (r) => (r.bankDetails ? "Y" : "N") },
      { header: "Fields", value: (r) => r.fields },
      { header: "tCO2e", value: (r) => r.tCO2e },
      { header: "Delivered ha", value: (r) => r.deliveredHectares },
      { header: "Delivered ac", value: (r) => r.deliveredAcres },
      { header: "Amount USD", value: (r) => r.amount },
      { header: "Payment done", value: (r) => (r.paymentDone ? "Y" : "N") },
    ];
    downloadCsv(
      `clients-${seasonLabel.replace(/\s+/g, "-").toLowerCase()}.csv`,
      toCsv(filtered, cols),
    );
  }

  const stageOptions = [
    ...PIPELINE_STAGES.map((s, i) => ({
      value: String(i),
      label: `Stuck before: ${s.shortLabel}`,
    })),
    { value: "complete", label: "Complete" },
  ];

  const th = "text-xs font-medium";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
          value={crop || undefined}
          onChange={setCrop}
          options={CROP_OPTIONS}
          includeEmpty
          emptyLabel="All crops"
          placeholder="All crops"
        />
        <SelectField
          label=""
          value={cp || undefined}
          onChange={setCp}
          options={[
            { value: "__direct__", label: "Direct growers" },
            ...channelPartnerNames.map((n) => ({ value: n, label: n })),
          ]}
          includeEmpty
          emptyLabel="All CP / Direct"
          placeholder="All CP / Direct"
        />
        <SelectField
          label=""
          value={stage || undefined}
          onChange={setStage}
          options={stageOptions}
          includeEmpty
          emptyLabel="All stages"
          placeholder="All stages"
        />
        <SelectField
          label=""
          value={payment || undefined}
          onChange={setPayment}
          options={[
            { value: "done", label: "Paid" },
            { value: "outstanding", label: "Payment outstanding" },
          ]}
          includeEmpty
          emptyLabel="All payment"
          placeholder="All payment"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length} clients · {seasonLabel}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} disabled={!seasonId}>
            <Plus className="h-4 w-4" /> New client
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No clients in this season"
          description="Add a grower to start tracking its enrollment pipeline, or carry forward from a previous season."
          action={
            <Button onClick={() => setDialogOpen(true)} disabled={!seasonId}>
              <Plus className="h-4 w-4" /> New client
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">
                  Client
                </TableHead>
                <TableHead>CP / Direct</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className={`${th} text-center`}>Legal ent.</TableHead>
                <TableHead className={th}>Data</TableHead>
                <TableHead className={`${th} text-center`}>Field req.</TableHead>
                <TableHead className={th}>NPKS</TableHead>
                <TableHead className={th}>Flags</TableHead>
                <TableHead className={`${th} text-center`}>Field conf.</TableHead>
                <TableHead className={th}>Evidence</TableHead>
                <TableHead className={th}>ECC</TableHead>
                <TableHead className={th}>W-8 type</TableHead>
                <TableHead className={`${th} text-center`}>W-8 CF</TableHead>
                <TableHead className={`${th} text-center`}>W-8 match</TableHead>
                <TableHead className={th}>Contract</TableHead>
                <TableHead className={`${th} text-center`}>Ctr appr.</TableHead>
                <TableHead className={`${th} text-center`}>Bank</TableHead>
                <TableHead className="text-right">Delivered ac</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className={`${th} text-center`}>Paid</TableHead>
                <TableHead className="w-[44px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <Link
                      href={`/clients/${r.clientId}`}
                      className="hover:underline"
                    >
                      {r.clientName}
                    </Link>
                    {r.legalEntity && (
                      <div className="text-xs text-muted-foreground">
                        {r.legalEntity}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.orgNodeKind === "DIRECT_GROWER" ? (
                      <Badge variant="muted">Direct</Badge>
                    ) : (
                      <span className="text-sm">{r.channelPartnerName}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {COUNTRY_LABELS[r.country]}
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.crop}
                      onChange={(v) => patch(r.id, { crop: v as never })}
                      options={CROP_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <PipelineProgress cs={r} />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.legalEntitySetup}
                      onChange={(v) => patch(r.id, { legalEntitySetup: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.dataStatus}
                      onChange={(v) => patch(r.id, { dataStatus: v as never })}
                      options={DATA_STATUS_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.fieldRequested}
                      onChange={(v) => patch(r.id, { fieldRequested: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.qaqcNpks}
                      onChange={(v) => patch(r.id, { qaqcNpks: v as never })}
                      options={QAQC_NPKS_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.qaqcFlags}
                      onChange={(v) => patch(r.id, { qaqcFlags: v as never })}
                      options={QAQC_FLAGS_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.fieldConfirmed}
                      onChange={(v) => patch(r.id, { fieldConfirmed: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.evidencing}
                      onChange={(v) => patch(r.id, { evidencing: v as never })}
                      options={EVIDENCING_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.ecc}
                      onChange={(v) => patch(r.id, { ecc: v as never })}
                      options={ECC_STATUS_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.w8Type}
                      onChange={(v) =>
                        patch(r.id, { w8Type: (v || null) as never })
                      }
                      options={W8_TYPE_OPTIONS}
                      includeEmpty
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.w8InCropForce}
                      onChange={(v) => patch(r.id, { w8InCropForce: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.w8MatchesLegalEntity}
                      onChange={(v) => patch(r.id, { w8MatchesLegalEntity: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEnum
                      value={r.contractStatus}
                      onChange={(v) =>
                        patch(r.id, { contractStatus: v as never })
                      }
                      options={CONTRACT_STATUS_OPTIONS}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.contractApprovedInCropForce}
                      onChange={(v) =>
                        patch(r.id, { contractApprovedInCropForce: v })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.bankDetails}
                      onChange={(v) => patch(r.id, { bankDetails: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.deliveredAcres)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(r.amount)}
                  </TableCell>
                  <TableCell>
                    <InlineBool
                      value={r.paymentDone}
                      onChange={(v) => patch(r.id, { paymentDone: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${r.clientId}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orgNodes={orgNodes}
        mills={mills}
        seasonId={seasonId}
      />
    </div>
  );
}
