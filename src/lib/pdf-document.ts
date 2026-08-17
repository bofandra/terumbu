export type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size: number;
  font?: "regular" | "bold";
  color?: string;
};

export const PDF_PAGE_WIDTH = 595;
export const PDF_PAGE_HEIGHT = 842;

export const PDF_COLORS = {
  coral: "0.800 0.373 0.271",
  kelp: "0.071 0.435 0.435",
  ocean: "0.027 0.204 0.247",
  muted: "0.376 0.451 0.478",
  sand: "0.965 0.941 0.902",
  white: "1 1 1",
  border: "0.847 0.894 0.863",
  seal: "0.894 0.953 0.914",
  wash: "0.957 0.976 0.957"
};

export function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfString(value: string) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function wrapPdfText(value: string, maxWidth: number, fontSize: number) {
  const normalized = sanitizePdfText(value);
  const averageCharacterWidth = fontSize * 0.52;
  const maxCharacters = Math.max(12, Math.floor(maxWidth / averageCharacterWidth));
  const lines: string[] = [];

  for (const word of normalized.split(" ")) {
    if (word.length > maxCharacters) {
      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }
      continue;
    }

    const current = lines.at(-1);

    if (!current) {
      lines.push(word);
      continue;
    }

    if (`${current} ${word}`.length <= maxCharacters) {
      lines[lines.length - 1] = `${current} ${word}`;
      continue;
    }

    lines.push(word);
  }

  return lines.length ? lines : [""];
}

export function pdfTextCommand({ text, x, y, size, font = "regular", color = PDF_COLORS.ocean }: PdfTextLine) {
  const fontResource = font === "bold" ? "F2" : "F1";

  return `BT /${fontResource} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdfString(text)}) Tj ET`;
}

export function pdfRectangleCommand(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  const fillCommand = `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;
  const strokeCommand = stroke ? `q ${stroke} RG 1 w ${x} ${y} ${width} ${height} re S Q` : "";

  return [fillCommand, strokeCommand].filter(Boolean).join("\n");
}

export function buildPdfDocument(contentStream: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`
  ];
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(parts.join("").length);
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = parts.join("").length;
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push("0000000000 65535 f \n");

  offsets.slice(1).forEach((offset) => {
    parts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  });

  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new TextEncoder().encode(parts.join(""));
}
