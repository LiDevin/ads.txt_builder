export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

function splitLines(content: string): string[] {
  return content === "" ? [] : content.split("\n");
}

// Longest-common-subsequence line diff: a plain text-line diff (as opposed to
// one that understands ads.txt's own syntax), matching git's default behavior
// of showing a changed line as a removal plus an addition.
export function diffLines(before: string, after: string): DiffLine[] {
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);

  const lcsLength: number[][] = Array.from({ length: beforeLines.length + 1 }, () =>
    new Array<number>(afterLines.length + 1).fill(0),
  );

  for (let i = beforeLines.length - 1; i >= 0; i--) {
    for (let j = afterLines.length - 1; j >= 0; j--) {
      lcsLength[i][j] =
        beforeLines[i] === afterLines[j]
          ? lcsLength[i + 1][j + 1] + 1
          : Math.max(lcsLength[i + 1][j], lcsLength[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < beforeLines.length && j < afterLines.length) {
    if (beforeLines[i] === afterLines[j]) {
      result.push({ type: "unchanged", text: beforeLines[i] });
      i++;
      j++;
    } else if (lcsLength[i + 1][j] >= lcsLength[i][j + 1]) {
      result.push({ type: "removed", text: beforeLines[i] });
      i++;
    } else {
      result.push({ type: "added", text: afterLines[j] });
      j++;
    }
  }
  while (i < beforeLines.length) {
    result.push({ type: "removed", text: beforeLines[i] });
    i++;
  }
  while (j < afterLines.length) {
    result.push({ type: "added", text: afterLines[j] });
    j++;
  }

  return result;
}
