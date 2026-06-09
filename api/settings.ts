import { ensureSheets, getSheetsClient, requireAuth, sanitize, checkEnvConfig } from "./_sheets.js";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!requireAuth(req, res)) {
    return;
  }

  if (!checkEnvConfig(res)) {
    return;
  }

  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (req.method === "GET") {
    try {
      await ensureSheets();
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "Settings!A2:B100"
      });

      const rows = response.data.values || [];
      const settings: { [key: string]: string } = {};
      for (const r of rows) {
        if (r[0]) {
          settings[r[0]] = r[1] || "";
        }
      }

      if (!settings.reporterName) {
        settings.reporterName = "Khan";
      }

      return res.status(200).json(settings);
    } catch (error: any) {
      console.error("Lỗi khi tải Settings:", error);
      return res.status(200).json({ reporterName: "Khan" });
    }
  } else if (req.method === "PUT") {
    const config = req.body;

    try {
      await ensureSheets();
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "Settings!A1:B100"
      });

      const rows = response.data.values || [];
      
      for (const [key, rawValue] of Object.entries(config)) {
        const value = sanitize(String(rawValue));
        const rowIndex = rows.findIndex((r) => r[0] === key);

        if (rowIndex !== -1) {
          const sheetsRow = rowIndex + 1;
          await client.spreadsheets.values.update({
            spreadsheetId,
            range: `Settings!A${sheetsRow}:B${sheetsRow}`,
            valueInputOption: "RAW",
            requestBody: {
              values: [[key, value]]
            }
          });
        } else {
          await client.spreadsheets.values.append({
            spreadsheetId,
            range: "Settings!A1",
            valueInputOption: "RAW",
            requestBody: {
              values: [[key, value]]
            }
          });
        }
      }

      return res.status(200).json({ success: true, settings: config });
    } catch (error: any) {
      console.error("Lỗi khi cập nhật Settings:", error);
      return res.status(500).json({ error: error.message || "Không thể cập nhật cài đặt." });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
