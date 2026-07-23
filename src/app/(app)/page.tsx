import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { getPipelineStatus } from "@/lib/pipeline";
import { computeShedLoaded } from "@/lib/supply-shed";
import { PageHeader } from "@/components/page-header";
import { NoSeason } from "@/components/no-season";
import { DashboardClient } from "./dashboard-client";
import type {
  DashClient,
  DashCp,
  DashShed,
} from "./dashboard-types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = getCurrentUserId();
  const season = await getSelectedSeason();

  if (!season) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Program overview" />
        <NoSeason />
      </div>
    );
  }

  const [clientSeasons, channelPartners, sheds] = await Promise.all([
    prisma.clientSeason.findMany({
      where: { seasonId: season.id, client: { userId } },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            country: true,
            regions: { select: { id: true } },
            orgNode: {
              select: {
                channelPartnerId: true,
                channelPartner: { select: { entityName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.channelPartner.findMany({
      where: { userId },
      include: {
        seasons: {
          where: { seasonId: season.id },
          include: { payees: true },
        },
      },
    }),
    prisma.supplyShed.findMany({
      where: { seasonId: season.id, userId },
      select: {
        id: true,
        channelPartnerId: true,
        crop: true,
        country: true,
        regionId: true,
        acresNeeded: true,
        hectaresNeeded: true,
      },
    }),
  ]);

  const clients: DashClient[] = clientSeasons.map((cs) => {
    const status = getPipelineStatus(cs);
    const cpId = cs.client.orgNode.channelPartnerId;
    return {
      clientId: cs.client.id,
      clientName: cs.client.name,
      country: cs.client.country,
      crops: cs.crops,
      cpKey: cpId ?? "__direct__",
      cpName: cpId
        ? cs.client.orgNode.channelPartner?.entityName ?? "Channel Partner"
        : "Direct",
      stageIndex: status.stageIndex,
      isComplete: status.isComplete,
      currentStageShort: status.currentStageShort,
      enrolledAcres: cs.enrolledAcres ?? 0,
      enrolledHectares: cs.enrolledHectares ?? 0,
      deliveredAcres: cs.deliveredAcres ?? 0,
      deliveredHectares: cs.deliveredHectares ?? 0,
      tCO2e: cs.tCO2e ?? 0,
      amount: cs.amount ?? 0,
      paymentDone: cs.paymentDone,
      w8Complete:
        cs.w8Type != null && cs.w8InCropForce && cs.w8MatchesLegalEntity,
      contractComplete:
        cs.contractStatus === "SIGNED" && cs.contractApprovedInCropForce,
      bankDetails: cs.bankDetails,
    };
  });

  const cps: DashCp[] = channelPartners.map((cp) => {
    const cs = cp.seasons[0];
    return {
      cpKey: cp.id,
      cpName: cp.entityName,
      hasSeason: !!cs,
      agreementSigned: cs?.agreementSigned ?? false,
      w8Provided: cs?.w8Provided ?? false,
      payees: (cs?.payees ?? []).map((p) => ({
        basis: p.basis,
        rate: p.rate,
      })),
    };
  });

  // Allotment loaded auto-rolled from delivered grower area.
  const csForShed = clientSeasons.map((cs) => ({
    crops: cs.crops,
    deliveredAcres: cs.deliveredAcres,
    deliveredHectares: cs.deliveredHectares,
    client: {
      country: cs.client.country,
      regionIds: cs.client.regions.map((r) => r.id),
      orgNode: { channelPartnerId: cs.client.orgNode.channelPartnerId },
    },
  }));
  const loaded = computeShedLoaded(sheds, csForShed);

  const dashSheds: DashShed[] = sheds.map((s) => {
    const l = loaded.get(s.id) ?? { loadedAcres: 0, loadedHectares: 0 };
    return {
      cpKey: s.channelPartnerId ?? "__direct__",
      crop: s.crop,
      country: s.country,
      acresNeeded: s.acresNeeded,
      hectaresNeeded: s.hectaresNeeded,
      acresLoaded: l.loadedAcres,
      hectaresLoaded: l.loadedHectares,
    };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Where you are, where you're behind, and volume roll-ups for ${season.label}.`}
      />
      <DashboardClient
        clients={clients}
        cps={cps}
        sheds={dashSheds}
        seasonLabel={season.label}
      />
    </div>
  );
}
