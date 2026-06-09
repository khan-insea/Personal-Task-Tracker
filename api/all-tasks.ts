import { ensureSheets, getSheetsClient, requireAuth } from "./_sheets";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAuth(req, res)) {
    return;
  }

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A2:J5000"
    });

    const rows = response.data.values || [];
    const tasks = rows.map((r) => ({
      id: r[0] || "",
      date: r[1] || "",
      name: r[2] || "",
      type: r[3] || "",
      title: r[4] || "",
      link: r[5] || "",
      status: r[6] || "",
      note: r[7] || "",
      createdAt: r[8] || "",
      updatedAt: r[9] || ""
    })).filter((t) => t.id);

    return res.status(200).json(tasks);
  } catch (error: any) {
    console.error("Lỗi khi tải toàn bộ Tasks:", error);
    return res.status(500).json({ error: error.message || "Không thể tải toàn bộ danh sách công việc." });
  }
}
