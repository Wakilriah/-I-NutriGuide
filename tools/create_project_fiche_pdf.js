const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "docs", "project-data-and-tools-fiche.md");
const outputPath = path.join(root, "docs", "project-data-and-tools-fiche.pdf");

const raw = fs.readFileSync(inputPath, "utf8");

const page = {
  width: 595.28,
  height: 841.89,
  marginLeft: 54,
  marginRight: 54,
  marginTop: 54,
  marginBottom: 54,
};

const usableWidth = page.width - page.marginLeft - page.marginRight;

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function normalizeText(value) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–|—/g, "-")
    .replace(/→/g, "->")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/\u00a0/g, " ");
}

function charWidth(fontSize, mono = false) {
  return fontSize * (mono ? 0.58 : 0.52);
}

function wrapText(text, fontSize, mono = false) {
  const maxChars = Math.max(12, Math.floor(usableWidth / charWidth(fontSize, mono)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (word.length <= maxChars) {
      line = word;
    } else {
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      line = "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

function parseMarkdown(markdown) {
  const lines = normalizeText(markdown).split(/\r?\n/);
  const blocks = [];
  let inCode = false;
  let code = [];

  for (const sourceLine of lines) {
    const line = sourceLine.trimEnd();

    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      blocks.push({ type: "space" });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: `h${heading[1].length}`, text: heading[2].replace(/\*\*/g, "") });
      continue;
    }

    if (line.startsWith("- ")) {
      blocks.push({ type: "bullet", text: line.slice(2).replace(/\*\*/g, "") });
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      blocks.push({ type: "paragraph", text: line.replace(/\*\*/g, "") });
      continue;
    }

    if (line.includes("|")) {
      blocks.push({ type: "code", text: line });
      continue;
    }

    blocks.push({ type: "paragraph", text: line.replace(/\*\*/g, "") });
  }

  return blocks;
}

const pages = [];
let current = [];
let y = page.height - page.marginTop;

function newPage() {
  pages.push(current);
  current = [];
  y = page.height - page.marginTop;
}

function ensureRoom(height) {
  if (y - height < page.marginBottom) newPage();
}

function addLine(text, x, font, size, leading) {
  ensureRoom(leading);
  current.push({ text, x, y, font, size });
  y -= leading;
}

function addWrapped(text, options) {
  const font = options.font || "F1";
  const size = options.size || 10;
  const leading = options.leading || size + 4;
  const indent = options.indent || 0;
  const prefix = options.prefix || "";
  const mono = font === "F2";
  const lines = wrapText(text, size, mono);

  lines.forEach((line, index) => {
    const value = index === 0 ? `${prefix}${line}` : `${" ".repeat(prefix.length)}${line}`;
    addLine(value, page.marginLeft + indent, font, size, leading);
  });
}

for (const block of parseMarkdown(raw)) {
  if (block.type === "space") {
    y -= 5;
    continue;
  }

  if (block.type === "h1") {
    ensureRoom(36);
    addWrapped(block.text, { font: "F3", size: 20, leading: 26 });
    y -= 8;
    continue;
  }

  if (block.type === "h2") {
    ensureRoom(30);
    y -= 8;
    addWrapped(block.text, { font: "F3", size: 14, leading: 18 });
    y -= 4;
    continue;
  }

  if (block.type === "h3") {
    ensureRoom(24);
    y -= 5;
    addWrapped(block.text, { font: "F3", size: 11.5, leading: 15 });
    y -= 2;
    continue;
  }

  if (block.type === "bullet") {
    addWrapped(block.text, { size: 10, leading: 14, indent: 12, prefix: "- " });
    continue;
  }

  if (block.type === "code") {
    const codeLines = block.text.split("\n");
    y -= 3;
    for (const codeLine of codeLines) {
      addWrapped(codeLine || " ", { font: "F2", size: 8.5, leading: 12, indent: 10 });
    }
    y -= 3;
    continue;
  }

  addWrapped(block.text, { size: 10, leading: 14 });
}

if (current.length) pages.push(current);

function object(id, body) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

const objects = [];
const pageObjectIds = [];
let nextId = 1;
const catalogId = nextId++;
const pagesId = nextId++;
const fontRegularId = nextId++;
const fontMonoId = nextId++;
const fontBoldId = nextId++;

objects[fontRegularId] = object(fontRegularId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
objects[fontMonoId] = object(fontMonoId, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
objects[fontBoldId] = object(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

for (const pdfPage of pages) {
  const pageId = nextId++;
  const contentId = nextId++;
  pageObjectIds.push(pageId);

  const stream = [
    "BT",
    ...pdfPage.map((line) => `/${line.font} ${line.size} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj`),
    "ET",
  ].join("\n");

  objects[contentId] = object(contentId, `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  objects[pageId] = object(
    pageId,
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontMonoId} 0 R /F3 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
}

objects[pagesId] = object(pagesId, `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);
objects[catalogId] = object(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let id = 1; id < nextId; id += 1) {
  offsets[id] = Buffer.byteLength(pdf, "utf8");
  pdf += objects[id];
}

const xrefOffset = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${nextId}\n0000000000 65535 f \n`;
for (let id = 1; id < nextId; id += 1) {
  pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(outputPath, pdf, "binary");
console.log(outputPath);
