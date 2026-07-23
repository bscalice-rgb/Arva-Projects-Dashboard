import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import {
  CHANNEL_PARTNER_TYPE_LABELS,
  COUNTRY_LABELS,
} from "@/lib/enums";
import { emptyAgg, addToAgg } from "@/lib/rollups";
import { getPipelineStatus } from "@/lib/pipeline";
import { PageHeader } from "@/components/page-header";
import { NoSeason } from "@/components/no-season";
import { CpDetail } from "./cp-detail";

export const dynamic = "force-dynamic";

export default async function CpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = getCurrentUserId();
  const season = await getSelectedSeason();

  const cp = await prisma.channelPartner.findFirst({
    where: { id, userId },
  });
  if (!cp) notFound();

  if (!season) {
    return (
      <div>
        <PageHeader title={cp.entityName} />
        <NoSeason />
      </div>
    );
  }

  const [cpSeason, clientSeasons, mills, regions] = await Promise.all([
    prisma.channelPartnerSeason.findUnique({
      where: {
        channelPartnerId_seasonId: {
          channelPartnerId: id,
          seasonId: season.id,
        },
      },
      include: { payees: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.clientSeason.findMany({
      where: {
        seasonId: season.id,
        client: { orgNode: { channelPartnerId: id } },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { client: { name: "asc" } },
    }),
    prisma.mill.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, crop: true },
    }),
    prisma.region.findMany({
      where: { userId },
      orderBy: [{ country: "asc" }, { name: "asc" }],
      select: { id: true, name: true, country: true },
    }),
  ]);

  const agg = emptyAgg();
  for (const cs of clientSeasons) addToAgg(agg, cs);

  const clients = clientSeasons.map((cs) => ({
    clientId: cs.client.id,
    name: cs.client.name,
    deliveredAcres: cs.deliveredAcres,
    amount: cs.amount,
    currentStageShort: getPipelineStatus(cs).currentStageShort,
    paymentDone: cs.paymentDone,
  }));

  return (
    <CpDetail
      cpId={cp.id}
      cpName={cp.entityName}
      cpTypeLabel={CHANNEL_PARTNER_TYPE_LABELS[cp.type]}
      countryLabel={COUNTRY_LABELS[cp.country]}
      seasonId={season.id}
      seasonLabel={season.label}
      cpSeason={
        cpSeason
          ? {
              id: cpSeason.id,
              agreementSigned: cpSeason.agreementSigned,
              w8Provided: cpSeason.w8Provided,
              bankDetails: cpSeason.bankDetails,
              paymentDone: cpSeason.paymentDone,
              agreementComments: cpSeason.agreementComments,
            }
          : null
      }
      agg={agg}
      payees={cpSeason?.payees ?? []}
      clients={clients}
      mills={mills}
      regions={regions}
    />
  );
}
