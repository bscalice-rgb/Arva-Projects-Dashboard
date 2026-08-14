"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NumberField,
  SelectField,
  CheckboxField,
  TextField,
  TextAreaField,
  LinkedAreaFields,
  MultiSelectField,
} from "@/components/form-fields";
import {
  ClientFormDialog,
  type CpOption,
  type MillOption,
  type RegionOption,
  type ClientIdentity,
} from "../client-form-dialog";
import {
  CROP_OPTIONS,
  DATA_STATUS_OPTIONS,
  QAQC_STATUS_OPTIONS,
  EVIDENCING_OPTIONS,
  ECC_STATUS_OPTIONS,
  W8_TYPE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  ORG_NODE_KIND_LABELS,
} from "@/lib/enums";
import { PIPELINE_STAGES, getPipelineStatus } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { saveClientSeason, addClientToSeason, deleteClient } from "../actions";
import { AreaByState } from "./area-by-state";
import type { ClientSeasonRow } from "../types";

type SeasonLink = { seasonId: string; label: string; clientSeasonId: string };

type PrevSeasonInfo = {
  label: string;
  hadW8: boolean;
  contractSigned: boolean;
  bankDetails: boolean;
};

function toForm(r: ClientSeasonRow) {
  const n = (v: number | null) => (v == null ? "" : String(v));
  return {
    crops: r.crops as string[],
    enrolledHectares: n(r.enrolledHectares),
    enrolledAcres: n(r.enrolledAcres),
    boundariesStatus: r.boundariesStatus,
    dataStatus: r.dataStatus,
    legalEntitySetup: r.legalEntitySetup,
    fieldRequested: r.fieldRequested,
    qaqc: r.qaqc,
    fieldConfirmed: r.fieldConfirmed,
    evidencing: r.evidencing,
    ecc: r.ecc,
    eccLink: r.eccLink ?? "",
    w8Type: r.w8Type ?? "",
    w8InCropForce: r.w8InCropForce,
    w8MatchesLegalEntity: r.w8MatchesLegalEntity,
    contractStatus: r.contractStatus,
    contractApprovedInCropForce: r.contractApprovedInCropForce,
    bankDetails: r.bankDetails,
    fields: n(r.fields),
    tCO2e: n(r.tCO2e),
    deliveredHectares: n(r.deliveredHectares),
    deliveredAcres: n(r.deliveredAcres),
    amount: n(r.amount),
    paymentDone: r.paymentDone,
    comments: r.comments ?? "",
  };
}
type FormState = ReturnType<typeof toForm>;

export function ClientDetail({
  identity,
  displayCountry,
  orgNodeName,
  orgNodeKind,
  channelPartnerName,
  millName,
  cropsDisplay,
  regionsDisplay,
  channelPartners,
  mills,
  regions,
  clientRegions,
  areas,
  seasonLinks,
  activeSeasonId,
  activeSeasonLabel,
  record,
  carriedForwardNote,
  prevSeason,
}: {
  identity: ClientIdentity;
  displayCountry: string;
  orgNodeName: string;
  orgNodeKind: keyof typeof ORG_NODE_KIND_LABELS;
  channelPartnerName: string | null;
  millName: string | null;
  cropsDisplay: string;
  regionsDisplay: string;
  channelPartners: CpOption[];
  mills: MillOption[];
  regions: RegionOption[];
  clientRegions: { id: string; name: string }[];
  areas: {
    regionId: string;
    enrolledAcres: number | null;
    enrolledHectares: number | null;
    deliveredAcres: number | null;
    deliveredHectares: number | null;
  }[];
  seasonLinks: SeasonLink[];
  activeSeasonId: string | null;
  activeSeasonLabel: string | null;
  record: ClientSeasonRow | null;
  carriedForwardNote: string | null;
  prevSeason: PrevSeasonInfo | null;
}) {
  const perState = clientRegions.length > 1;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(
    record ? toForm(record) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function onSeasonChange(seasonId: string) {
    router.push(`/clients/${identity.id}?season=${seasonId}`);
  }

  function addToActiveSeason() {
    if (!activeSeasonId) return;
    startTransition(async () => {
      const res = await addClientToSeason(identity.id, activeSeasonId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onDeleteGrower() {
    if (
      !confirm(
        `Delete grower "${identity.name}"? This permanently removes the grower and its records across ALL seasons.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteClient(identity.id);
      if (!res.ok) setError(res.error);
      else router.push("/clients");
    });
  }

  function save() {
    if (!form || !record) return;
    setError(null);
    startTransition(async () => {
      const res = await saveClientSeason(record.id, {
        crops: form.crops,
        enrolledHectares: form.enrolledHectares,
        enrolledAcres: form.enrolledAcres,
        boundariesStatus: form.boundariesStatus,
        dataStatus: form.dataStatus,
        legalEntitySetup: form.legalEntitySetup,
        fieldRequested: form.fieldRequested,
        qaqc: form.qaqc,
        fieldConfirmed: form.fieldConfirmed,
        evidencing: form.evidencing,
        ecc: form.ecc,
        eccLink: form.eccLink,
        w8Type: form.w8Type || null,
        w8InCropForce: form.w8InCropForce,
        w8MatchesLegalEntity: form.w8MatchesLegalEntity,
        contractStatus: form.contractStatus,
        contractApprovedInCropForce: form.contractApprovedInCropForce,
        bankDetails: form.bankDetails,
        fields: form.fields,
        tCO2e: form.tCO2e,
        deliveredHectares: form.deliveredHectares,
        deliveredAcres: form.deliveredAcres,
        amount: form.amount,
        paymentDone: form.paymentDone,
        comments: form.comments,
      });
      if (!res.ok) setError(res.error);
      else {
        setSavedAt(Date.now());
        router.refresh();
      }
    });
  }

  // Live pipeline status from current form.
  const status = form
    ? getPipelineStatus({
        boundariesStatus: form.boundariesStatus,
        dataStatus: form.dataStatus,
        legalEntitySetup: form.legalEntitySetup,
        fieldRequested: form.fieldRequested,
        qaqc: form.qaqc,
        fieldConfirmed: form.fieldConfirmed,
        evidencing: form.evidencing,
        ecc: form.ecc,
        w8Type: (form.w8Type || null) as never,
        w8InCropForce: form.w8InCropForce,
        w8MatchesLegalEntity: form.w8MatchesLegalEntity,
        contractStatus: form.contractStatus,
        contractApprovedInCropForce: form.contractApprovedInCropForce,
        bankDetails: form.bankDetails,
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" /> Clients
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {identity.name}
          </h1>
          {identity.legalEntity && (
            <p className="text-sm text-muted-foreground">
              Legal entity: {identity.legalEntity}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {seasonLinks.length > 0 && (
            <Select value={activeSeasonId ?? undefined} onValueChange={onSeasonChange}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {seasonLinks.map((s) => (
                  <SelectItem key={s.seasonId} value={s.seasonId}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit identity
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDeleteGrower}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Identity card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Info label="Org Node" value={orgNodeName} />
          <Info label="Kind" value={ORG_NODE_KIND_LABELS[orgNodeKind]} />
          <Info label="Channel Partner" value={channelPartnerName ?? "—"} />
          <Info label="Country" value={displayCountry} />
          <Info label="Regions" value={regionsDisplay || "—"} />
          <Info label="Crops" value={cropsDisplay || "—"} />
          <Info label="Mill / Refinery" value={millName ?? "—"} />
        </CardContent>
      </Card>

      {!record || !form ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No record for {activeSeasonLabel ?? "this season"} yet.
            </p>
            {activeSeasonId && (
              <Button onClick={addToActiveSeason} disabled={pending}>
                Add to {activeSeasonLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-3">
            {/* Pipeline stepper with inline controls */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Execution pipeline — {activeSeasonLabel}
                  </CardTitle>
                  <Badge variant={status?.isComplete ? "success" : "secondary"}>
                    {status?.isComplete
                      ? "Complete"
                      : `Current: ${status?.currentStageShort}`}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Progress
                    value={(status?.percentComplete ?? 0) * 100}
                    className="h-2"
                    indicatorClassName={
                      status?.isComplete ? "bg-success" : undefined
                    }
                  />
                  <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {status?.stageIndex ?? 0} / {PIPELINE_STAGES.length} steps
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <PipelineStepper
                  form={form}
                  set={set}
                  status={status}
                  prevSeason={prevSeason}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Section title="Enrollment">
                <MultiSelectField
                  label="Crops (this season)"
                  selected={form.crops}
                  onChange={(v) => set("crops", v)}
                  options={CROP_OPTIONS}
                />
                {perState ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Enrolled area: <strong>{form.enrolledHectares || "0"} ha</strong>{" "}
                    (summed from the states below)
                  </div>
                ) : (
                  <LinkedAreaFields
                    label="Enrolled area"
                    acres={form.enrolledAcres}
                    hectares={form.enrolledHectares}
                    onAcres={(v) => set("enrolledAcres", v)}
                    onHectares={(v) => set("enrolledHectares", v)}
                  />
                )}
              </Section>

              {perState && activeSeasonId && record && (
                <AreaByState
                  clientSeasonId={record.id}
                  regions={clientRegions}
                  initialAreas={areas}
                />
              )}

              <Section
                title="Outcomes — as contracted"
                description="What was agreed in the contracts."
              >
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="Fields"
                    value={form.fields}
                    onChange={(v) => set("fields", v)}
                  />
                  <NumberField
                    label="tCO₂e"
                    value={form.tCO2e}
                    onChange={(v) => set("tCO2e", v)}
                  />
                </div>
                {perState ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Delivered area:{" "}
                    <strong>{form.deliveredHectares || "0"} ha</strong> (summed
                    from the states above)
                  </div>
                ) : (
                  <LinkedAreaFields
                    label="Delivered area"
                    acres={form.deliveredAcres}
                    hectares={form.deliveredHectares}
                    onAcres={(v) => set("deliveredAcres", v)}
                    onHectares={(v) => set("deliveredHectares", v)}
                  />
                )}
                <NumberField
                  label="Amount (grower payment, USD)"
                  value={form.amount}
                  onChange={(v) => set("amount", v)}
                />
                <CheckboxField
                  label="Payment done"
                  checked={form.paymentDone}
                  onChange={(v) => set("paymentDone", v)}
                />
              </Section>

              <Section title="Notes">
                <TextAreaField
                  label="Comments"
                  value={form.comments}
                  onChange={(v) => set("comments", v)}
                />
                {carriedForwardNote && (
                  <p className="text-xs text-muted-foreground">
                    {carriedForwardNote}
                  </p>
                )}
              </Section>
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-background/95 py-3 backdrop-blur">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {savedAt && !error && (
              <p className="text-sm text-success">Saved</p>
            )}
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save season record"}
            </Button>
          </div>
        </>
      )}

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        channelPartners={channelPartners}
        mills={mills}
        regions={regions}
        seasonId={activeSeasonId}
        editing={identity}
      />
    </div>
  );
}

/**
 * Vertical stepper: one row per pipeline stage, in order, with that stage's
 * controls inline. The current stage is expanded by default; any stage can be
 * opened or collapsed by clicking its header.
 */
function PipelineStepper({
  form,
  set,
  status,
  prevSeason,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  status: ReturnType<typeof getPipelineStatus> | null;
  prevSeason: PrevSeasonInfo | null;
}) {
  // Manual open/close overrides; stages without an override follow "is current".
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function stageControls(key: string) {
    switch (key) {
      case "boundaries":
        return (
          <SelectField
            label="Boundaries upload"
            value={form.boundariesStatus}
            onChange={(v) => set("boundariesStatus", v as never)}
            options={DATA_STATUS_OPTIONS}
          />
        );
      case "dataUpload":
        return (
          <SelectField
            label="Data upload"
            value={form.dataStatus}
            onChange={(v) => set("dataStatus", v as never)}
            options={DATA_STATUS_OPTIONS}
          />
        );
      case "legalEntitySetup":
        return (
          <CheckboxField
            label="Legal entity setup complete"
            checked={form.legalEntitySetup}
            onChange={(v) => set("legalEntitySetup", v)}
          />
        );
      case "requested":
        return (
          <CheckboxField
            label="Requested"
            checked={form.fieldRequested}
            onChange={(v) => set("fieldRequested", v)}
          />
        );
      case "qaqc":
        return (
          <SelectField
            label="QA/QC status"
            value={form.qaqc}
            onChange={(v) => set("qaqc", v as never)}
            options={QAQC_STATUS_OPTIONS}
          />
        );
      case "evidencing":
        return (
          <SelectField
            label="Evidencing"
            value={form.evidencing}
            onChange={(v) => set("evidencing", v as never)}
            options={EVIDENCING_OPTIONS}
          />
        );
      case "ecc":
        return (
          <>
            <SelectField
              label="ECC status"
              value={form.ecc}
              onChange={(v) => set("ecc", v as never)}
              options={ECC_STATUS_OPTIONS}
            />
            <TextField
              label="ECC link"
              value={form.eccLink}
              onChange={(v) => set("eccLink", v)}
              placeholder="https://…"
            />
          </>
        );
      case "confirmed":
        return (
          <CheckboxField
            label="Confirmed"
            checked={form.fieldConfirmed}
            onChange={(v) => set("fieldConfirmed", v)}
          />
        );
      case "w8":
        return (
          <>
            {prevSeason?.hadW8 && !form.w8Type && (
              <PrevHint
                what="A W-8"
                seasonLabel={prevSeason.label}
              />
            )}
            <SelectField
              label="W-8 type"
              value={form.w8Type || undefined}
              onChange={(v) => set("w8Type", v as never)}
              options={W8_TYPE_OPTIONS}
              includeEmpty
              emptyLabel="Not set"
            />
            <CheckboxField
              label="W-8 in CropForce"
              checked={form.w8InCropForce}
              onChange={(v) => set("w8InCropForce", v)}
            />
            <CheckboxField
              label="W-8 matches legal entity (contract ↔ W-8 ↔ legal entity)"
              checked={form.w8MatchesLegalEntity}
              onChange={(v) => set("w8MatchesLegalEntity", v)}
            />
          </>
        );
      case "contractBank":
        return (
          <>
            {prevSeason?.contractSigned &&
              form.contractStatus !== "SIGNED" && (
                <PrevHint
                  what="A signed contract"
                  seasonLabel={prevSeason.label}
                />
              )}
            {prevSeason?.bankDetails && !form.bankDetails && (
              <PrevHint
                what="Bank details"
                seasonLabel={prevSeason.label}
              />
            )}
            <SelectField
              label="Contract status"
              value={form.contractStatus}
              onChange={(v) => set("contractStatus", v as never)}
              options={CONTRACT_STATUS_OPTIONS}
            />
            <CheckboxField
              label="Contract approved in CropForce"
              checked={form.contractApprovedInCropForce}
              onChange={(v) => set("contractApprovedInCropForce", v)}
            />
            <CheckboxField
              label="Bank details on file"
              checked={form.bankDetails}
              onChange={(v) => set("bankDetails", v)}
            />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <ol className="space-y-1">
      {PIPELINE_STAGES.map((stage, i) => {
        const done = status?.completed[i] ?? false;
        const current = status?.stageIndex === i;
        const open = overrides[stage.key] ?? current;
        return (
          <li
            key={stage.key}
            className={cn(
              "rounded-lg border transition-colors",
              done && "border-success/40 bg-success/5",
              current && "border-primary bg-primary/5",
              !done && !current && "border-border",
            )}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              onClick={() =>
                setOverrides((o) => ({ ...o, [stage.key]: !open }))
              }
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  done
                    ? "border-success bg-success text-success-foreground"
                    : current
                      ? "border-primary text-primary"
                      : "border-muted-foreground/40 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "flex-1 text-sm",
                  current && "font-medium",
                  !done && !current && "text-muted-foreground",
                )}
              >
                {stage.shortLabel}
              </span>
              {current && !done && (
                <Badge variant="secondary" className="text-[10px]">
                  Current
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            {open && (
              <div className="space-y-3 border-t px-3 py-3 pl-12">
                {stageControls(stage.key)}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** "On file last season, not yet this season" reminder inside a stage. */
function PrevHint({
  what,
  seasonLabel,
}: {
  what: string;
  seasonLabel: string;
}) {
  return (
    <p className="text-xs text-amber-600 dark:text-amber-500">
      {what} was on file for {seasonLabel} — collect it again for this season.
    </p>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
