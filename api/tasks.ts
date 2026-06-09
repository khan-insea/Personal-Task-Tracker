import { ensureSheets, getSheetsClient, requireAuth, sanitize, getReporterSettings, getSheetId } from "./_sheets";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!requireAuth(req, res)) {
    return;
  }

  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const idQuery = req.query.id; // From vercel rewrite for PUT/DELETE or directly

  if (req.method === "GET") {
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Thiếu tham số 'date' (YYYY-MM-DD)!" });
    }

    try {
      await ensureSheets();

      // Get all tasks
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "Tasks!A2:J1000"
      });

      const rows = response.data.values || [];
      let tasks = rows.map((r) => ({
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

      // Filter tasks for the requested date
      let dateTasks = tasks.filter((t) => t.date === date);

      // If no tasks exist for this date, automatically pre-populate active FixedTasks
      if (dateTasks.length === 0) {
        const fixedTasksResponse = await client.spreadsheets.values.get({
          spreadsheetId,
          range: "FixedTasks!A2:F500"
        });

        const fixedRows = fixedTasksResponse.data.values || [];
        const activeFixedTasks = fixedRows
          .map((r) => ({
            id: r[0] || "",
            title: r[1] || "",
            link: r[2] || "",
            active: r[3] === "TRUE" || r[3] === "true" || r[3] === true || r[3] === "yes"
          }))
          .filter((ft) => ft.id && ft.active);

        if (activeFixedTasks.length > 0) {
          const settings = await getReporterSettings();
          const nowStr = new Date().toISOString();
          
          // Construct pre-populated tasks
          const newTasks = activeFixedTasks.map((ft, idx) => ({
            id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
            date,
            name: settings.reporterName || "Khan",
            type: "Công việc cố định",
            title: ft.title,
            link: ft.link || "",
            status: "Chưa làm",
            note: "",
            createdAt: nowStr,
            updatedAt: nowStr
          }));

          // Append to Google Sheets
          const appendRows = newTasks.map((t) => [
            t.id,
            t.date,
            t.name,
            t.type,
            t.title,
            t.link,
            t.status,
            t.note,
            t.createdAt,
            t.updatedAt
          ]);

          await client.spreadsheets.values.append({
            spreadsheetId,
            range: "Tasks!A1",
            valueInputOption: "RAW",
            requestBody: {
              values: appendRows
            }
          });

          dateTasks = newTasks;
        }
      }

      return res.status(200).json(dateTasks);
    } catch (error: any) {
      console.error("Lỗi lấy danh sách Tasks:", error);
      return res.status(500).json({ error: error.message || "Không thể tải danh sách công việc hằng ngày." });
    }
  } else if (req.method === "POST") {
    const { date, name, type, title, link, status, note } = req.body || {};

    if (!date || !type || !title) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ các thông tin: ngày, loại và nội dung công việc!" });
    }

    try {
      await ensureSheets();
      const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowStr = new Date().toISOString();

      const newTask = {
        id,
        date,
        name: sanitize(name) || "Khan",
        type: sanitize(type),
        title: sanitize(title),
        link: sanitize(link),
        status: sanitize(status) || "Chưa làm",
        note: sanitize(note),
        createdAt: nowStr,
        updatedAt: nowStr
      };

      await client.spreadsheets.values.append({
        spreadsheetId,
        range: "Tasks!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            newTask.id,
            newTask.date,
            newTask.name,
            newTask.type,
            newTask.title,
            newTask.link,
            newTask.status,
            newTask.note,
            newTask.createdAt,
            newTask.updatedAt
          ]]
        }
      });

      return res.status(200).json(newTask);
    } catch (error: any) {
      console.error("Lỗi thêm Task mới:", error);
      return res.status(500).json({ error: error.message || "Không thể tạo công việc mới." });
    }
  } else if (req.method === "PUT") {
    if (!idQuery) {
      return res.status(400).json({ error: "Thiếu tham số 'id' công việc cần sửa!" });
    }

    const { date, name, type, title, link, status, note } = req.body || {};

    try {
      await ensureSheets();

      // Get all task rows
      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "Tasks!A1:J1000"
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === idQuery);

      if (rowIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy công việc cần cập nhật!" });
      }

      const currentTask = rows[rowIndex];
      const nowStr = new Date().toISOString();

      const updatedTask = [
        idQuery,
        date || currentTask[1],
        sanitize(name) || currentTask[2],
        sanitize(type) || currentTask[3],
        sanitize(title) || currentTask[4],
        sanitize(link) !== undefined ? sanitize(link) : currentTask[5],
        sanitize(status) || currentTask[6],
        sanitize(note) !== undefined ? sanitize(note) : currentTask[7],
        currentTask[8] || nowStr,
        nowStr
      ];

      const sheetsRow = rowIndex + 1;

      await client.spreadsheets.values.update({
        spreadsheetId,
        range: `Tasks!A${sheetsRow}:J${sheetsRow}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [updatedTask]
        }
      });

      return res.status(200).json({
        id: idQuery,
        date: updatedTask[1],
        name: updatedTask[2],
        type: updatedTask[3],
        title: updatedTask[4],
        link: updatedTask[5],
        status: updatedTask[6],
        note: updatedTask[7],
        createdAt: updatedTask[8],
        updatedAt: updatedTask[9]
      });
    } catch (error: any) {
      console.error("Lỗi cập nhật Task:", error);
      return res.status(500).json({ error: error.message || "Không thể cập nhật công việc." });
    }
  } else if (req.method === "DELETE") {
    if (!idQuery) {
      return res.status(400).json({ error: "Thiếu tham số 'id' công việc cần xóa!" });
    }

    try {
      await ensureSheets();

      const response = await client.spreadsheets.values.get({
        spreadsheetId,
        range: "Tasks!A1:A1000"
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === idQuery);

      if (rowIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy công việc cần xóa!" });
      }

      const sheetId = getSheetId("Tasks");
      if (sheetId === undefined) {
        return res.status(500).json({ error: "Lỗi nội bộ: Không thể tìm thấy mã sheet Tasks." });
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
                  startIndex: rowIndex, // 0-based index of row to delete (inclusive)
                  endIndex: rowIndex + 1 // 0-based index (exclusive)
                }
              }
            }
          ]
        }
      });

      return res.status(200).json({ success: true, message: "Đã xóa công việc khỏi danh sách." });
    } catch (error: any) {
      console.error("Lỗi xóa Task:", error);
      return res.status(500).json({ error: error.message || "Không thể xóa công việc." });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
