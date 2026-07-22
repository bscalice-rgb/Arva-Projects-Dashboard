"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, Circle, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/form-fields";
import {
  ClientFormDialog,
  type CpOption,
  type MillOption,
  type ClientIdentity,
} from "../client-form-dialog";
import {
  COUNTRY_LABELS,
  CROP_LABELS,
  CROP_OPTIONS,
  DATA_STATUS_OPTIONS,
  QAQC_NPKS_OPTIONS,
  QAQC_FLAGS_OPTIONS,
  EVIDENCING_OPTIONS,
  ECC_STATUS_OPTIONS,
  W8_TYPE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  ORG_NODE_KIND_LABELS,
} from "@/lib/enums";
import { PIPELINE_STAGES, getPipelineStatus } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { saveClientSeason, addClientToSeason } from "../actions";
import type { ClientSeasonRow } from "../types";

type SeasonLink = { seasonId: string; label: string; clientSeasonId: string };

function toForm(r: ClientSeasonRow) {
  const n = (v: number | null) => (v == null ? "" : String(v));
  return {
    crop: r.crop,
    enrolledHectares: n(r.enrolledHectares),
    enrolledAcres: n(r.enrolledAcres),
    legalEntitySetup: r.legalEntitySetup,
    dataStatus: r.dataStatus,
    fieldRequested: r.fieldRequested,
    qaqcNpks: r.qaqcNpks,
    qaqcFlags: r.qaqcFlags,
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
  channelPartners,
  mills,
  seasonLinks,
  activeSeasonId,
  activeSeasonLabel,
  record,
  carriedForwardNote,
}: {
  identity: ClientIdentity;
  displayCountry: string;
  orgNodeName: string;
  orgNodeKind: keyof typeof ORG_NODE_KIND_LABELS;
  channelPartnerName: string | null;
  millName: string | null;
  channelPartners: CpOption[];
  mills: MillOption[];
  seasonLinks: SeasonLink[];
  activeSeasonId: string | null;
  activeSeasonLabel: string | null;
  record: ClientSeasonRow | null;
  carriedForwardNote: string | null;
}) {
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

  function save() {
    if (!form || !record) return;
    setError(null);
    startTransition(async () => {
      const res = await saveClientSeason(record.id, {
        crop: form.crop,
        enrolledHectares: form.enrolledHectares,
        enrolledAcres: form.enrolledAcres,
        legalEntitySetup: form.legalEntitySetup,
        dataStatus: form.dataStatus,
        fieldRequested: form.fieldRequested,
        qaqcNpks: form.qaqcNpks,
        qaqcFlags: form.qaqcFlags,
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
        legalEntitySetup: form.legalEntitySetup,
        dataStatus: form.dataStatus,
        fieldRequested: form.fieldRequested,
        qaqcNpks: form.qaqcNpks,
        qaqcFlags: form.qaqcFlags,
        fieldConfirmed: form.fieldConfirmed,
        evidencing: form.evidencing,
        ecc: form.ecc,
        eccLink: form.eccLink,
        w8Type: (form.w8Type || null) as never,
        w8InCropForce: form.w8InCropForce,
        w8MatchesLegalEntity: form.w8MatchesLegalEntity,
        contractStatus: form.contractStatus,
        contractApprovedInCropForce: form.contractApprovedInCropForce,
        bankDetails: form.bankDetails,
        fields: form.fields ? Number(form.fields) : null,
        tCO2e: form.tCO2e ? Number(form.tCO2e) : null,
        deliveredAcres: form.deliveredAcres ? Number(form.deliveredAcres) : null,
        deliveredHectares: form.deliveredHectares
          ? Number(form.deliveredHectares)
          : null,
        amount: form.amount ? Number(form.amount) : null,
        paymentDone: form.paymentDone,
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
          <Info label="Region" value={identity.region ?? "—"} />
          <Info label="Default crop" value={CROP_LABELS[identity.defaultCrop]} />
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
          {/* Pipeline stepper */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">
                Execution pipeline — {activeSeasonLabel}
              </CardTitle>
              <Badge variant={status?.isComplete ? "success" : "secondary"}>
                {status?.isComplete
                  ? "Complete"
                  : `Current: ${status?.currentStage}`}
              </Badge>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PIPELINE_STAGES.map((stage, i) => {
                  const done = status?.completed[i];
                  const current = status?.stageIndex === i;
                  return (
                    <li
                      key={stage.key}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                        done && "border-success/40 bg-success/5",
                        current && "border-primary bg-primary/5 font-medium",
                      )}
                    >
                      {done ? (
                        <Check className="h-4 w-4 shrink-0 text-success" />
                      ) : current ? (
                        <Dot className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className={cn(done && "text-foreground")}>
                        {stage.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {/* Editable sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Enrollment">
              <SelectField
                label="Crop (this season)"
                value={form.crop}
                onChange={(v) => set("crop", v as never)}
                options={CROP_OPTIONS}
              />
              <LinkedAreaFields
                label="Enrolled area"
                acres={form.enrolledAcres}
                hectares={form.enrolledHectares}
                onAcres={(v) => set("enrolledAcres", v)}
                onHectares={(v) => set("enrolledHectares", v)}
              />
            </Section>

            <Section title="Data & QA/QC">
              <CheckboxField
                label="Legal entity setup"
                checked={form.legalEntitySetup}
                onChange={(v) => set("legalEntitySetup", v)}
              />
              <SelectField
                label="Data status"
                value={form.dataStatus}
                onChange={(v) => set("dataStatus", v as never)}
                options={DATA_STATUS_OPTIONS}
              />
              <CheckboxField
                label="Field requested"
                checked={form.fieldRequested}
                onChange={(v) => set("fieldRequested", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="NPKS fix"
                  value={form.qaqcNpks}
                  onChange={(v) => set("qaqcNpks", v as never)}
                  options={QAQC_NPKS_OPTIONS}
                />
                <SelectField
                  label="Flags"
                  value={form.qaqcFlags}
                  onChange={(v) => set("qaqcFlags", v as never)}
                  options={QAQC_FLAGS_OPTIONS}
                />
              </div>
              <CheckboxField
                label="Field confirmed"
                checked={form.fieldConfirmed}
                onChange={(v) => set("fieldConfirmed", v)}
              />
            </Section>

            <Section title="Evidence">
              <SelectField
                label="Evidencing"
                value={form.evidencing}
                onChange={(v) => set("evidencing", v as never)}
                options={EVIDENCING_OPTIONS}
              />
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
            </Section>

            <Section title="W-8, Contract & Bank">
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
            </Section>

            <Section title="Outcomes">
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
              <LinkedAreaFields
                label="Delivered area"
                acres={form.deliveredAcres}
                hectares={form.deliveredHectares}
                onAcres={(v) => set("deliveredAcres", v)}
                onHectares={(v) => set("deliveredHectares", v)}
              />
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
        seasonId={activeSeasonId}
        editing={identity}
      />
    </div>
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
