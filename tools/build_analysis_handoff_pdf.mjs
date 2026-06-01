import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("docs/I-NutriGuide_Application_Analysis_Handoff.pdf");

const documentTitle = "I-NutriGuide Application Analysis Handoff";
const generatedOn = "May 30, 2026";

const sections = [
  {
    heading: "Purpose",
    body: [
      "This PDF is a compact handoff for another ChatGPT session to analyze the current I-NutriGuide application. It summarizes the architecture, runtime services, data imports, recommendation engine, admin panel, mobile app, and recent changes.",
      "Sensitive local credentials are intentionally omitted. Use the repository and environment files on the local machine for private operational details.",
    ],
  },
  {
    heading: "Project Shape",
    bullets: [
      "Monorepo root: c:/Users/hp/Desktop/inutriguide_codex_docs",
      "Backend: apps/backend, Django 5.1 + Django REST Framework.",
      "Admin panel: apps/admin-panel, React + Vite.",
      "Mobile app: apps/mobile-app, Expo Router + React Native Web.",
      "Shared packages: packages/shared-types and packages/config.",
      "Infrastructure: Docker Compose with PostgreSQL, Redis, Neo4j, backend, admin panel, mobile app, Celery worker/beat, and Dozzle.",
    ],
  },
  {
    heading: "Local Runtime",
    bullets: [
      "Backend API: http://localhost:8000",
      "Backend health: http://localhost:8000/api/v1/health/",
      "Admin panel: http://localhost:5173",
      "Mobile web / Expo: http://localhost:8081",
      "PostgreSQL: localhost:5432",
      "Redis: localhost:6379",
      "Neo4j browser: http://localhost:7474",
      "Main startup command used during development: docker compose -f docker-compose.dev.yml up -d --build backend admin_panel mobile_app",
    ],
  },
  {
    heading: "Current Database Snapshot",
    bullets: [
      "Foods: 3,263 active of 3,263 total.",
      "Supplements: 106 catalog rows.",
      "Nutrients: 84.",
      "Supplement normalizations: 105.",
      "Canonical supplement categories: 24.",
      "Food-supplement seed synergy rules: 161.",
      "Safety constraints: 8.",
      "Association transactions: 1,200 with 9,029 transaction items.",
      "Mined association rules: 80.",
      "Synced scoring rules: 170.",
      "Nutrient interactions: 10.",
      "Recommendation runs: 29 with 191 recommendation items.",
      "Saved recommendation foods: 1.",
    ],
  },
  {
    heading: "Backend Domain Model",
    bullets: [
      "Food catalog models include FoodCategory, Food, and FoodNutrient.",
      "Food now stores image_path, image_alt, recommended_for_supplements, nutrient_tags, synergy_reason, avoid_or_caution, allergen_tags, diet_tags, association_rule_items, and is_active.",
      "Recommendation history is stored in RecommendationRun, RecommendationItem, and SavedRecommendationItem.",
      "Association-rule dataset models include SupplementCategory, SupplementNormalization, FoodSupplementSynergyRule, SafetyConstraint, AssociationTransaction, AssociationTransactionItem, and MinedAssociationRule.",
      "Legacy/synced scoring rules are stored in AssociationRule.",
      "Safety constraints are stored separately from positive synergy rules and should not become positive recommendations.",
    ],
  },
  {
    heading: "Recommendation Logic",
    bullets: [
      "Do not replace the current recommendation engine. The active logic is a hybrid recommender.",
      "Core ranking blends content-based filtering, nutrient/supplement matching, association-rule scoring, and collaborative preference signals from recommendation/feedback history.",
      "User supplements are normalized before rule matching using SupplementNormalization and SupplementCategory canonical items such as supp:iron or supp:vitamin_c.",
      "Positive association seed rules and mined rules can raise rule_score and add explanations.",
      "Medical/allergy/safety filters must remain stronger than positive association scores.",
      "Responses include food image metadata, score breakdown, confidence, matched supplement/rule metadata, synergy explanation, warnings, and feedback actions.",
    ],
  },
  {
    heading: "Data Import Commands",
    bullets: [
      "Food images CSV command: python manage.py import_food_images_seed data/i_nutriguide_food_images_seed.csv",
      "Association Excel import: python manage.py import_association_dataset \"data/I-NutriGuide_association_rule_dataset that i creat.xlsx\"",
      "Mining command: python manage.py mine_association_rules",
      "Rule refresh command: python manage.py refresh_recommendation_rules",
      "Recommended post-import flow: makemigrations, migrate, import dataset, mine rules, refresh rules, run tests.",
    ],
  },
  {
    heading: "API Surface To Inspect",
    bullets: [
      "Authentication: /api/v1/auth/login/, /api/v1/auth/me/, /api/v1/auth/refresh/.",
      "Recommendations: /api/v1/recommendations/foods/?n=10, /api/v1/recommendations/generate/, /api/v1/recommendations/preview/.",
      "Admin dashboard: /api/v1/admin/dashboard/.",
      "Admin recommendation review: /api/v1/admin/recommendations/.",
      "Rule dataset admin APIs: association supplement categories, supplement normalizations, synergy seed rules, safety constraints, mined association rules, and association transactions.",
      "Knowledge APIs: foods, nutrients, supplements, nutrition interactions.",
    ],
  },
  {
    heading: "Admin Panel",
    bullets: [
      "Routes include Dashboard, Foods, Add Food, Knowledge Base, Rules, Rule Dataset, Recommendations, Feedback, Chats, and Users.",
      "Dashboard now emphasizes Supplement Knowledge, normalization map, seed rules, mined rules, safety constraints, transactions, interactions, recommended foods, and saved foods.",
      "Knowledge Base supplements page now shows the supplement catalog plus imported normalization aliases and canonical supplement categories.",
      "Knowledge Base interactions page now combines nutrient interactions and imported supplement safety constraints.",
      "Food admin supports image preview and image metadata fields.",
      "The admin frontend API base is local: http://localhost:8000/api/v1.",
    ],
  },
  {
    heading: "Mobile App",
    bullets: [
      "Expo Router tab bar includes Home, Recs, Supps, Chat, and Profile.",
      "Supps tab uses a medkit icon and opens /tabs/supplements.",
      "Add supplement flow remains hidden at /tabs/supplements-new.",
      "Profile screen includes a bottom Log out button that clears session storage and routes to the welcome screen.",
      "Recommendation cards display food images, food name, match percentage, synergy reason, supplement connection, and safety note when available.",
      "Relative media paths from the backend should be prefixed with the backend media URL, with fallback image support.",
    ],
  },
  {
    heading: "Brand And UI Direction",
    bullets: [
      "App identity: clean wellness/nutrition style, green primary color, orange accents, rounded translucent cards, soft shadows, healthy food photography.",
      "Auth screens should reuse the welcome/get-started healthy-food background image with resizeMode cover and a soft overlay.",
      "Avoid creating disconnected designs for onboarding/auth/admin/mobile surfaces.",
      "Mobile pages should avoid overflow on small screens and keep forms readable.",
    ],
  },
  {
    heading: "Recent Fixes",
    bullets: [
      "Removed stale API URL pointing to 10.245.156.116 and rebuilt local services.",
      "Started backend, admin panel, and mobile app on localhost ports 8000, 5173, and 8081.",
      "Updated admin dashboard and knowledge-base UI for imported association data.",
      "Added the mobile Supps bottom-tab medkit icon.",
      "Added a bottom Log out button on the mobile Profile screen.",
    ],
  },
  {
    heading: "Suggested Analysis Prompt",
    body: [
      "Use this prompt with another ChatGPT:",
      "Analyze the I-NutriGuide application from this handoff. Focus on architecture quality, recommendation correctness, safety handling, data model consistency, admin usability, mobile UX, API completeness, test gaps, deployment risks, and next best improvements. Do not propose replacing the hybrid recommender; suggest incremental fixes that fit the current Django/React/Expo stack.",
    ],
  },
  {
    heading: "High-Value Review Questions",
    bullets: [
      "Are supplement normalizations used consistently in all recommendation entry points?",
      "Do safety constraints and allergy checks always override positive association rules?",
      "Are image_path and fallback media handling consistent across backend, admin, and mobile?",
      "Are admin counts and page labels clear enough for non-technical data management?",
      "Are mobile navigation, logout, supplement routines, and recommendation details ergonomic on small screens?",
      "Which tests should be added first for the highest risk paths?",
      "What production security settings need review before deployment?",
    ],
  },
];

const page = {
  width: 612,
  height: 792,
  marginX: 54,
  marginTop: 54,
  marginBottom: 54,
};

const colors = {
  green: "0.184 0.490 0.196",
  dark: "0.090 0.121 0.160",
  muted: "0.360 0.410 0.470",
  orange: "0.930 0.420 0.090",
};

function escapePdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text, fontSize, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const avgCharWidth = fontSize * 0.51;
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length * avgCharWidth <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const pages = [];
let current = [];
let y = page.height - page.marginTop;

function addPage() {
  pages.push(current);
  current = [];
  y = page.height - page.marginTop;
}

function ensureSpace(height) {
  if (y - height < page.marginBottom) addPage();
}

function textLine(text, x, font, size, color, lineY = y) {
  current.push({ type: "text", text, x, y: lineY, font, size, color });
}

function addWrapped(text, { x = page.marginX, size = 10.5, font = "regular", color = colors.dark, leading = 14, maxWidth = page.width - page.marginX * 2, before = 0, after = 0 } = {}) {
  y -= before;
  const lines = wrapText(text, size, maxWidth);
  ensureSpace(lines.length * leading + after);
  for (const line of lines) {
    textLine(line, x, font, size, color);
    y -= leading;
  }
  y -= after;
}

function addHeading(heading) {
  ensureSpace(34);
  y -= 16;
  textLine(heading, page.marginX, "bold", 15, colors.green);
  y -= 18;
}

function addBullet(text) {
  const x = page.marginX + 16;
  const lines = wrapText(text, 10.2, page.width - page.marginX * 2 - 20);
  ensureSpace(lines.length * 13.5 + 3);
  textLine("-", page.marginX + 2, "bold", 10.5, colors.orange);
  lines.forEach((line, index) => {
    textLine(line, x, "regular", 10.2, colors.dark, y - index * 13.5);
  });
  y -= lines.length * 13.5 + 3;
}

function drawTitlePage() {
  current.push({ type: "rule", x1: page.marginX, y1: 704, x2: page.width - page.marginX, y2: 704, color: colors.green, width: 2 });
  textLine(documentTitle, page.marginX, "bold", 25, colors.green, 675);
  textLine("Architecture, data, recommendation, admin, and mobile handoff", page.marginX, "regular", 12, colors.muted, 650);
  textLine(`Generated: ${generatedOn}`, page.marginX, "regular", 10.5, colors.muted, 628);
  y = 590;
  addWrapped("Audience: another ChatGPT or reviewer analyzing the current I-NutriGuide application without first reading the entire repository.", { size: 11.5, leading: 16, after: 8 });
  addWrapped("Scope: local development build, Docker services, Django backend, React admin panel, Expo mobile app, food image metadata, supplement normalization, association rules, safety constraints, and recent UI/runtime fixes.", { size: 11.5, leading: 16, after: 10 });
}

drawTitlePage();
for (const section of sections) {
  addHeading(section.heading);
  for (const paragraph of section.body ?? []) {
    addWrapped(paragraph, { after: 5 });
  }
  for (const bullet of section.bullets ?? []) {
    addBullet(bullet);
  }
}
if (current.length) addPage();

function streamForPage(items, pageNumber) {
  const commands = ["q"];
  for (const item of items) {
    if (item.type === "text") {
      const font = item.font === "bold" ? "F2" : "F1";
      commands.push("BT");
      commands.push(`/${font} ${item.size} Tf`);
      commands.push(`${item.color} rg`);
      commands.push(`1 0 0 1 ${item.x.toFixed(2)} ${item.y.toFixed(2)} Tm`);
      commands.push(`(${escapePdfText(item.text)}) Tj`);
      commands.push("ET");
    } else if (item.type === "rule") {
      commands.push(`${item.color} RG`);
      commands.push(`${item.width} w`);
      commands.push(`${item.x1} ${item.y1} m ${item.x2} ${item.y2} l S`);
    }
  }
  commands.push("BT");
  commands.push("/F1 8 Tf");
  commands.push(`${colors.muted} rg`);
  commands.push(`1 0 0 1 ${page.width - page.marginX - 40} 30 Tm`);
  commands.push(`(${pageNumber}) Tj`);
  commands.push("ET");
  commands.push("Q");
  return commands.join("\n");
}

function buildPdf() {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach((items, index) => {
    const stream = streamForPage(items, index + 1);
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((content, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buildPdf(), "binary");
console.log(outputPath);
