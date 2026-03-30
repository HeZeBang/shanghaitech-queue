import Papa from "papaparse";

export interface StudentRow {
  studentId: string;
  name: string;
  email?: string;
}

export function parseStudentCSV(text: string): StudentRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Try CSV parse first
  const result = Papa.parse(trimmed, {
    skipEmptyLines: true,
  });

  const rows: StudentRow[] = [];

  for (const row of result.data as string[][]) {
    if (!row || row.length === 0) continue;

    const first = row[0]?.trim();
    if (!first) continue;

    // Skip header row
    if (
      first.toLowerCase() === "学号" ||
      first.toLowerCase() === "student_id" ||
      first.toLowerCase() === "studentid"
    )
      continue;

    if (row.length >= 2) {
      rows.push({
        studentId: first,
        name: row[1]?.trim() || first,
        email: row[2]?.trim() || undefined,
      });
    } else {
      // Single column: treat as student ID, use ID as name placeholder
      rows.push({
        studentId: first,
        name: first,
      });
    }
  }

  return rows;
}

export function generateExportCSV(
  data: Array<{
    studentId: string;
    name: string;
    status: string;
    joinedAt: string;
    checkStartedAt: string | null;
    checkEndedAt: string | null;
    durationSeconds: number | null;
    notes: string | null;
  }>
): string {
  return Papa.unparse({
    fields: [
      "学号",
      "姓名",
      "状态",
      "加入时间",
      "开始检查",
      "完成检查",
      "检查时长(秒)",
      "备注",
    ],
    data: data.map((d) => [
      d.studentId,
      d.name,
      d.status,
      d.joinedAt,
      d.checkStartedAt || "",
      d.checkEndedAt || "",
      d.durationSeconds ?? "",
      d.notes || "",
    ]),
  });
}
