import { marked } from 'marked';

const DEFAULT_MARKDOWN_KEYS = [
  'markdown',
  'briefing',
  'output',
  'body',
  'content',
  'report',
  'result',
  'data',
] as const;

export function extractMarkdownContent(
  raw: string,
  preferredKeys: readonly string[] = DEFAULT_MARKDOWN_KEYS,
): string {
  let current: unknown = raw.trim();

  for (let depth = 0; depth < 6; depth += 1) {
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (!trimmed) {
        return '';
      }

      if (looksLikeJson(trimmed)) {
        const parsed = tryParseJson(trimmed);
        if (parsed !== null) {
          current = parsed;
          continue;
        }
      }

      return normalizeMarkdownString(trimmed);
    }

    if (Array.isArray(current)) {
      current = current[0] ?? '';
      continue;
    }

    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>;
      const preferredValue = preferredKeys
        .map((key) => record[key])
        .find((value) => value !== undefined);

      if (preferredValue !== undefined) {
        current = preferredValue;
        continue;
      }
    }

    break;
  }

  return '';
}

export function normalizeMarkdownString(value: string): string {
  let content = value.replace(/^markdown\r?\n/i, '').trim();

  if (!content.includes('\n') && content.includes('\\n')) {
    content = content.replace(/\\n/g, '\n');
  }

  if (content.includes('\\"')) {
    content = content.replace(/\\"/g, '"');
  }

  if (content.includes('\\r')) {
    content = content.replace(/\\r/g, '');
  }

  return repairMalformedPipeTables(content).trim();
}

export function renderMarkdownToHtml(markdown: string): string {
  const result = marked.parse(normalizeMarkdownString(markdown));
  return typeof result === 'string' ? result : '';
}

function repairMalformedPipeTables(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let insideFence = false;

  for (let index = 0; index < lines.length - 1; index += 1) {
    const currentLine = lines[index];
    const trimmedCurrent = currentLine.trim();

    if (isFenceDelimiter(trimmedCurrent)) {
      insideFence = !insideFence;
      continue;
    }

    if (insideFence || !looksLikePipeRow(currentLine) || !looksLikePipeRow(lines[index + 1])) {
      continue;
    }

    const separatorCells = parsePipeCells(lines[index + 1]);
    const validColumnCount = countLeadingAlignmentCells(separatorCells);

    if (validColumnCount < 2 || validColumnCount >= separatorCells.length) {
      continue;
    }

    let blockEnd = index + 2;
    while (blockEnd < lines.length && looksLikePipeRow(lines[blockEnd])) {
      blockEnd += 1;
    }

    for (let rowIndex = index; rowIndex < blockEnd; rowIndex += 1) {
      const normalizedCells = normalizeTableRowCells(lines[rowIndex], validColumnCount);
      lines[rowIndex] = `| ${normalizedCells.join(' | ')} |`;
    }

    index = blockEnd - 1;
  }

  return lines.join('\n');
}

function normalizeTableRowCells(line: string, count: number): string[] {
  const cells = parsePipeCells(line);

  return Array.from({ length: count }, (_, index) => cells[index]?.trim() ?? '');
}

function parsePipeCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|');
}

function countLeadingAlignmentCells(cells: string[]): number {
  let validCount = 0;

  for (const cell of cells) {
    if (!/^:?-{3,}:?$/.test(cell.trim())) {
      break;
    }

    validCount += 1;
  }

  return validCount;
}

function looksLikePipeRow(line: string): boolean {
  return line.trim().startsWith('|');
}

function isFenceDelimiter(line: string): boolean {
  return line.startsWith('```') || line.startsWith('~~~');
}

function looksLikeJson(value: string): boolean {
  return value.startsWith('{') || value.startsWith('[') || value.startsWith('"');
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
