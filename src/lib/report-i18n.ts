// Localization for the partner report (English, Brazilian Portuguese, LATAM
// Spanish). Only the report uses this; the rest of the app stays in English.

import type { Crop, Country } from "@prisma/client";

export type ReportLang = "en" | "pt" | "es";

export const REPORT_LANGS: { code: ReportLang; short: string; label: string }[] =
  [
    { code: "en", short: "EN", label: "English" },
    { code: "pt", short: "PT", label: "Português (BR)" },
    { code: "es", short: "ES", label: "Español (LATAM)" },
  ];

export function normalizeLang(v?: string): ReportLang {
  return v === "pt" || v === "es" ? v : "en";
}

export type ReportDict = {
  locale: string;
  subtitle: string;
  asOf: string;
  noSeason: string;
  kpiGrowers: string;
  kpiEnrolled: string;
  kpiDelivered: string;
  overallTitle: string;
  growersComplete: (done: number, total: number) => string;
  secPipeline: string;
  secAllotment: string;
  noGrowersYet: string;
  enrolledLabel: (e: string, n: string, pct: number) => string;
  toEnroll: (x: string) => string;
  deliveredNote: (d: string, pct: number) => string;
  noAllotments: string;
  confidential: (cp: string, date: string) => string;
  growerDetail: string;
  legend: string;
  stepsDone: (done: number, total: number) => string;
  haEnrolled: (ha: string) => string;
  areaTbd: string;
  savePdf: string;
  backTo: (cp: string) => string;
  secPractices: string;
  practiceNa: string;
  practicesAllDone: string;
  pendingData: (list: string) => string;
  categories: Record<string, string>;
  items: Record<string, string>;
  practices: Record<string, string>;
  crop: Record<Crop, string>;
  country: Record<Country, string>;
};

const CATEGORY_KEYS = ["data", "enrollment", "contract"] as const;
const ITEM_KEYS = [
  "boundaries",
  "data",
  "qaqc",
  "evidencing",
  "legalEntity",
  "fieldRequested",
  "fieldConfirmed",
  "w8",
  "contract",
  "bank",
  "payment",
] as const;

const CROP_I18N: Record<ReportLang, Record<Crop, string>> = {
  en: {
    CORN: "Corn",
    SOYBEANS: "Soybeans",
    SUGARCANE: "Sugarcane",
    AFRICAN_OIL_PALM: "African Oil Palm",
    SUGARBEETS: "Sugarbeets",
    WHEAT: "Wheat",
    BARLEY: "Barley",
  },
  pt: {
    CORN: "Milho",
    SOYBEANS: "Soja",
    SUGARCANE: "Cana-de-açúcar",
    AFRICAN_OIL_PALM: "Palma (dendê)",
    SUGARBEETS: "Beterraba sacarina",
    WHEAT: "Trigo",
    BARLEY: "Cevada",
  },
  es: {
    CORN: "Maíz",
    SOYBEANS: "Soja",
    SUGARCANE: "Caña de azúcar",
    AFRICAN_OIL_PALM: "Palma aceitera",
    SUGARBEETS: "Remolacha azucarera",
    WHEAT: "Trigo",
    BARLEY: "Cebada",
  },
};

const COUNTRY_I18N: Record<ReportLang, Record<Country, string>> = {
  en: {
    ARG: "Argentina",
    BRA: "Brazil",
    CHL: "Chile",
    COL: "Colombia",
    IDN: "Indonesia",
    MEX: "Mexico",
    AUS: "Australia",
    PHL: "Philippines",
    USA: "United States",
    PRY: "Paraguay",
    URY: "Uruguay",
    BOL: "Bolivia",
    PER: "Peru",
    ECU: "Ecuador",
    IND: "India",
    THA: "Thailand",
    MYS: "Malaysia",
    VNM: "Vietnam",
    ZAF: "South Africa",
    OTHER: "Other",
  },
  pt: {
    ARG: "Argentina",
    BRA: "Brasil",
    CHL: "Chile",
    COL: "Colômbia",
    IDN: "Indonésia",
    MEX: "México",
    AUS: "Austrália",
    PHL: "Filipinas",
    USA: "Estados Unidos",
    PRY: "Paraguai",
    URY: "Uruguai",
    BOL: "Bolívia",
    PER: "Peru",
    ECU: "Equador",
    IND: "Índia",
    THA: "Tailândia",
    MYS: "Malásia",
    VNM: "Vietnã",
    ZAF: "África do Sul",
    OTHER: "Outro",
  },
  es: {
    ARG: "Argentina",
    BRA: "Brasil",
    CHL: "Chile",
    COL: "Colombia",
    IDN: "Indonesia",
    MEX: "México",
    AUS: "Australia",
    PHL: "Filipinas",
    USA: "Estados Unidos",
    PRY: "Paraguay",
    URY: "Uruguay",
    BOL: "Bolivia",
    PER: "Perú",
    ECU: "Ecuador",
    IND: "India",
    THA: "Tailandia",
    MYS: "Malasia",
    VNM: "Vietnam",
    ZAF: "Sudáfrica",
    OTHER: "Otro",
  },
};

const CATEGORY_I18N: Record<ReportLang, Record<string, string>> = {
  en: {
    data: "Data & evidence",
    enrollment: "Enrollment",
    contract: "Contract, bank & payment",
  },
  pt: {
    data: "Dados e evidências",
    enrollment: "Inscrição",
    contract: "Contrato, banco e pagamento",
  },
  es: {
    data: "Datos y evidencias",
    enrollment: "Inscripción",
    contract: "Contrato, banco y pago",
  },
};

const ITEM_I18N: Record<ReportLang, Record<string, string>> = {
  en: {
    boundaries: "Boundaries",
    data: "Data",
    qaqc: "QA/QC",
    evidencing: "Evidencing",
    legalEntity: "Legal entity",
    fieldRequested: "Field requested",
    fieldConfirmed: "Field confirmed",
    w8: "W-8",
    contract: "Contract",
    bank: "Bank details",
    payment: "Payment",
  },
  pt: {
    boundaries: "Limites",
    data: "Dados",
    qaqc: "QA/QC",
    evidencing: "Evidências",
    legalEntity: "Entidade legal",
    fieldRequested: "Campo solicitado",
    fieldConfirmed: "Campo confirmado",
    w8: "W-8",
    contract: "Contrato",
    bank: "Dados bancários",
    payment: "Pagamento",
  },
  es: {
    boundaries: "Límites",
    data: "Datos",
    qaqc: "QA/QC",
    evidencing: "Evidencias",
    legalEntity: "Entidad legal",
    fieldRequested: "Campo solicitado",
    fieldConfirmed: "Campo confirmado",
    w8: "W-8",
    contract: "Contrato",
    bank: "Datos bancarios",
    payment: "Pago",
  },
};

// Management-practice labels (keys match src/lib/practices.ts PracticeKey).
const PRACTICE_I18N: Record<ReportLang, Record<string, string>> = {
  en: {
    practicePlanting: "Planting",
    practiceHarvest: "Harvest",
    practiceTillage: "Tillage",
    practiceFertilizer: "Fertilizer",
    practiceLiming: "Liming",
    practiceCropProtection: "Crop protection",
    practiceIrrigation: "Irrigation",
    practiceCoverCropping: "Cover cropping",
    practiceSoilSampling: "Soil sampling",
    practiceAggregation: "Aggregation",
  },
  pt: {
    practicePlanting: "Plantio",
    practiceHarvest: "Colheita",
    practiceTillage: "Preparo do solo",
    practiceFertilizer: "Fertilizantes",
    practiceLiming: "Calagem",
    practiceCropProtection: "Defensivos",
    practiceIrrigation: "Irrigação",
    practiceCoverCropping: "Plantas de cobertura",
    practiceSoilSampling: "Amostragem de solo",
    practiceAggregation: "Agregação",
  },
  es: {
    practicePlanting: "Siembra",
    practiceHarvest: "Cosecha",
    practiceTillage: "Labranza",
    practiceFertilizer: "Fertilizantes",
    practiceLiming: "Encalado",
    practiceCropProtection: "Protección de cultivos",
    practiceIrrigation: "Riego",
    practiceCoverCropping: "Cultivos de cobertura",
    practiceSoilSampling: "Muestreo de suelo",
    practiceAggregation: "Agregación",
  },
};

const DICTS: Record<ReportLang, ReportDict> = {
  en: {
    locale: "en-US",
    subtitle: "Scope-3 Program — Partner Progress Report",
    asOf: "as of",
    noSeason: "No program year is set up yet.",
    kpiGrowers: "Growers enrolled",
    kpiEnrolled: "Enrolled area",
    kpiDelivered: "Delivered area",
    overallTitle: "Overall pipeline progress",
    growersComplete: (d, t) => `${d} of ${t} growers complete`,
    secPipeline: "Pipeline progress — growers with each step done",
    secAllotment: "Allotment progress (hectares)",
    noGrowersYet: "No growers enrolled yet.",
    enrolledLabel: (e, n, pct) => `Enrolled ${e} / ${n} ha (${pct}%)`,
    toEnroll: (x) => `${x} to enroll`,
    deliveredNote: (d, pct) =>
      `Delivered ${d} ha (${pct}%) — fills in later in the season`,
    noAllotments: "No allotments set for this partner.",
    confidential: (cp, date) =>
      `Confidential — prepared by Arva Intelligence for ${cp}. Figures reflect program data as of ${date}.`,
    growerDetail: "Grower detail",
    legend: "Green = done · grey = pending",
    stepsDone: (d, t) => `${d}/${t} steps done`,
    haEnrolled: (ha) => `${ha} ha enrolled`,
    areaTbd: "area TBD",
    savePdf: "Save as PDF",
    backTo: (cp) => `Back to ${cp}`,
    secPractices: "Data milestones — management practices confirmed",
    practiceNa: "n/a",
    practicesAllDone: "All data milestones confirmed.",
    pendingData: (list) => `Data pending: ${list}`,
    categories: CATEGORY_I18N.en,
    items: ITEM_I18N.en,
    practices: PRACTICE_I18N.en,
    crop: CROP_I18N.en,
    country: COUNTRY_I18N.en,
  },
  pt: {
    locale: "pt-BR",
    subtitle: "Programa Escopo 3 — Relatório de Progresso do Parceiro",
    asOf: "em",
    noSeason: "Nenhum ano-safra configurado ainda.",
    kpiGrowers: "Produtores inscritos",
    kpiEnrolled: "Área inscrita",
    kpiDelivered: "Área entregue",
    overallTitle: "Progresso geral do pipeline",
    growersComplete: (d, t) => `${d} de ${t} produtores concluídos`,
    secPipeline: "Progresso do pipeline — produtores com cada etapa concluída",
    secAllotment: "Progresso das alocações (hectares)",
    noGrowersYet: "Nenhum produtor inscrito ainda.",
    enrolledLabel: (e, n, pct) => `Inscrito ${e} / ${n} ha (${pct}%)`,
    toEnroll: (x) => `${x} a inscrever`,
    deliveredNote: (d, pct) =>
      `Entregue ${d} ha (${pct}%) — será preenchido mais adiante na safra`,
    noAllotments: "Nenhuma alocação definida para este parceiro.",
    confidential: (cp, date) =>
      `Confidencial — preparado pela Arva Intelligence para ${cp}. Os números refletem os dados do programa em ${date}.`,
    growerDetail: "Detalhe por produtor",
    legend: "Verde = concluído · cinza = pendente",
    stepsDone: (d, t) => `${d}/${t} etapas concluídas`,
    haEnrolled: (ha) => `${ha} ha inscritos`,
    areaTbd: "área a definir",
    savePdf: "Salvar como PDF",
    backTo: (cp) => `Voltar para ${cp}`,
    secPractices: "Marcos de dados — práticas de manejo confirmadas",
    practiceNa: "n/a",
    practicesAllDone: "Todos os marcos de dados confirmados.",
    pendingData: (list) => `Dados pendentes: ${list}`,
    categories: CATEGORY_I18N.pt,
    items: ITEM_I18N.pt,
    practices: PRACTICE_I18N.pt,
    crop: CROP_I18N.pt,
    country: COUNTRY_I18N.pt,
  },
  es: {
    locale: "es-419",
    subtitle: "Programa Alcance 3 — Informe de Progreso del Socio",
    asOf: "al",
    noSeason: "Aún no hay un año de programa configurado.",
    kpiGrowers: "Productores inscritos",
    kpiEnrolled: "Área inscrita",
    kpiDelivered: "Área entregada",
    overallTitle: "Progreso general del pipeline",
    growersComplete: (d, t) => `${d} de ${t} productores completos`,
    secPipeline: "Progreso del pipeline — productores con cada paso completado",
    secAllotment: "Progreso de asignaciones (hectáreas)",
    noGrowersYet: "Aún no hay productores inscritos.",
    enrolledLabel: (e, n, pct) => `Inscrito ${e} / ${n} ha (${pct}%)`,
    toEnroll: (x) => `${x} por inscribir`,
    deliveredNote: (d, pct) =>
      `Entregado ${d} ha (${pct}%) — se completa más adelante en la temporada`,
    noAllotments: "No hay asignaciones definidas para este socio.",
    confidential: (cp, date) =>
      `Confidencial — preparado por Arva Intelligence para ${cp}. Las cifras reflejan los datos del programa al ${date}.`,
    growerDetail: "Detalle por productor",
    legend: "Verde = completo · gris = pendiente",
    stepsDone: (d, t) => `${d}/${t} pasos completados`,
    haEnrolled: (ha) => `${ha} ha inscritas`,
    areaTbd: "área por definir",
    savePdf: "Guardar como PDF",
    backTo: (cp) => `Volver a ${cp}`,
    secPractices: "Hitos de datos — prácticas de manejo confirmadas",
    practiceNa: "n/d",
    practicesAllDone: "Todos los hitos de datos confirmados.",
    pendingData: (list) => `Datos pendientes: ${list}`,
    categories: CATEGORY_I18N.es,
    items: ITEM_I18N.es,
    practices: PRACTICE_I18N.es,
    crop: CROP_I18N.es,
    country: COUNTRY_I18N.es,
  },
};

export function getReportDict(lang: ReportLang): ReportDict {
  return DICTS[lang];
}

export { CATEGORY_KEYS, ITEM_KEYS };
