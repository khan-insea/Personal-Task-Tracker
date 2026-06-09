import { ensureSheets, getSheetsClient, requireAuth, sanitize, getSheetId } from "./_sheets";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!requireAuth(req, res)) {
    return;
  }

  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const idQuery = req.query.id; // From rewrite or direct query

  if (req.method === "GET") {
    try {
      await ensureSheets();
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "FixedTasks!A2:F500"
      });

      const rows = response.data.values || [];
      const fixedTasks = rows
        .map((r) => ({
          id: r[0] || "",
          title: r[1] || "",
          link: r[2] || "",
          active: r[3] === "TRUE" || r[3] === "true" || r[3] === true,
          createdAt: r[4] || "",
          updatedAt: r[5] || ""
        }))
        .filter((ft) => ft.id);

      return res.status(200).json(fixedTasks);
    } catch (error: any) {
      console.error("Lỗi lấy FixedTasks:", error);
      return res.status(500).json({ error: error.message || "Không thể tải danh công việc cố định." });
    }
  } else if (req.method === "POST") {
    const { title, link, active } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: "Tiêu đề công việc cố định không thể để trống!" });
    }

    try {
      await ensureSheets();
      const id = `fixed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowStr = new Date().toISOString();

      const newFixedTask = {
        id,
        title: sanitize(title),
        link: sanitize(link),
        active: active === true,
        createdAt: nowStr,
        updatedAt: nowStr
      };

      await client.spreadsheets.values.append({
        spreadsheetId,
        range: "FixedTasks!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            newFixedTask.id,
            newFixedTask.title,
            newFixedTask.link,
            newFixedTask.active ? "TRUE" : "FALSE",
            newFixedTask.createdAt,
            newFixedTask.updatedAt
          ]]
        }
      });

      return res.status(200).json(newFixedTask);
    } catch (error: any) {
      console.error("Lỗi thêm FixedTask:", error);
      return res.status(500).json({ error: error.message || "Không thể thêm công việc cố định." });
    }
  } else if (req.method === "PUT") {
    if (!idQuery) {
      return res.status(400).json({ error: "Thiếu tham số 'id' của công việc cố định!" });
    }

    const { title, link, active } = req.body || {};

    try {
      await ensureSheets();
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "FixedTasks!A1:F500"
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === idQuery);

      if (rowIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy công việc cố định cần sửa!" });
      }

      const currentFT = rows[rowIndex];
      const nowStr = new Date().toISOString();

      const updatedFT = [
        idQuery,
        title ? sanitize(title) : currentFT[1],
        link !== undefined ? sanitize(link) : currentFT[2],
        active !== undefined ? (active ? "TRUE" : "FALSE") : currentFT[3],
        currentFT[4] || nowStr,
        nowStr
      ];

      const sheetsRow = rowIndex + 1;

      await client.spreadsheets.values.update({
        spreadsheetId,
        range: `FixedTasks!A${sheetsRow}:F${sheetsRow}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [updatedFT]
        }
      });

      return res.status(200).json({
        id: idQuery,
        title: updatedFT[1],
        link: updatedFT[2],
        active: updatedFT[3] === "TRUE",
        createdAt: updatedFT[4],
        updatedAt: updatedFT[5]
      });
    } catch (error: any) {
      console.error("Lỗi cập nhật FixedTask:", error);
      return res.status(500).json({ error: error.message || "Không thể cập nhật công việc cố định." });
    }
  } else if (req.method === "DELETE") {
    if (!idQuery) {
      return res.status(400).json({ error: "Thiếu tham số 'id' của công việc cố định!" });
    }

    try {
      await ensureSheets();
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "FixedTasks!A1:A500"
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === idQuery);

      if (rowIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy công việc cố định cần xóa!" });
      }

      const sheetId = getSheetId("FixedTasks");
      if (sheetId === undefined) {
        return res.status(500).json({ error: "Lỗi hệ thống: Không thể tìm thấy mã ID của sheet FixedTasks" });
      }

      await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1
                }
              }
            }
          ]
        }
      });

      return res.status(200).json({ success: true, message: "Đã xóa công việc cố định thành công." });
    } catch (error: any) {
      console.error("Lỗi xóa FixedTask:", error);
      return res.status(500).json({ error: error.message || "Không thể xóa công việc cố định." });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
