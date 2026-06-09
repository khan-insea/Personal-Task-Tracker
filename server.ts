import express from "express";
import path from "path";
import { google } from "googleapis";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Fix Node.js DNS resolution preference for faster local connections
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Sheets client and metadata cache
let sheetsClient: any = null;
let sheetIdsCache: { [sheetName: string]: number } = {};

/**
 * Get or initialize Google Sheets client
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !privateKey || !spreadsheetId) {
    throw new Error(
      "Cấu hình Google Sheets chưa đầy đủ! Hãy bổ sung GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY và GOOGLE_SHEET_ID vào biến môi trường."
    );
  }

  // Handle newlines in the private key if stored as an escaped string
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

/**
 * Sanitize user input to prevent XSS or script execution
 */
function sanitize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:[^\s]*/gi, "");
}

/**
 * Create sheets mapping and ensure table structures exist in Google Sheets
 */
async function ensureSheets() {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const metadata = await client.spreadsheets.get({ spreadsheetId });
  const sheets = metadata.data.sheets || [];
  
  // Cache sheet IDs
  for (const sheet of sheets) {
    const title = sheet.properties?.title;
    const id = sheet.properties?.sheetId;
    if (title && id !== undefined) {
      sheetIdsCache[title] = id;
    }
  }

  const requiredSheets = [
    {
      name: "Tasks",
      headers: ["id", "date", "name", "type", "title", "link", "status", "note", "createdAt", "updatedAt"]
    },
    {
      name: "FixedTasks",
      headers: ["id", "title", "link", "active", "createdAt", "updatedAt"]
    },
    {
      name: "Settings",
      headers: ["key", "value"]
    }
  ];

  for (const reqSheet of requiredSheets) {
    if (sheetIdsCache[reqSheet.name] === undefined) {
      console.log(`Sheet "${reqSheet.name}" is missing. Creating...`);
      const createResponse = await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: reqSheet.name
                }
              }
            }
          ]
        }
      });

      const newId = createResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;
      if (newId !== undefined) {
        sheetIdsCache[reqSheet.name] = newId;
      }

      // Add Headers Row
      await client.spreadsheets.values.append({
        spreadsheetId,
        range: `${reqSheet.name}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [reqSheet.headers]
        }
      });
      console.log(`Initialized headers for ${reqSheet.name}`);
    }
  }
}

/**
 * Simple Authentication middleware
 */
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Chưa đăng nhập! Vui lòng nhập mật khẩu mở khóa." });
  }

  const token = authHeader.split(" ")[1];
  const serverPassword = process.env.APP_PASSWORD || "default_pass";
  const expectedToken = Buffer.from(serverPassword).toString("base64");

  if (token !== expectedToken) {
    return res.status(401).json({ error: "Mật khẩu không hợp lệ hoặc phiên làm việc đã hết hạn!" });
  }

  next();
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Authenticate / Login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const serverPassword = process.env.APP_PASSWORD;

  if (!serverPassword) {
    return res.status(500).json({ error: "APP_PASSWORD chưa được cấu hình trên server!" });
  }

  if (password === serverPassword) {
    const token = Buffer.from(serverPassword).toString("base64");
    return res.json({ success: true, token });
  }

  return res.status(401).json({ error: "Mật khẩu không đúng!" });
});

// App configuration settings helpers
async function getReporterSettings(): Promise<{ reporterName: string }> {
  try {
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A2:B100"
    });
    const rows = response.data.values || [];
    const settings: { [key: string]: string } = {};
    for (const r of rows) {
      if (r[0]) settings[r[0]] = r[1] || "";
    }
    return { reporterName: settings["reporterName"] || "Khan" };
  } catch (e) {
    return { reporterName: "Khan" };
  }
}

// 2. GET /api/tasks?date=YYYY-MM-DD
app.get("/api/tasks", requireAuth, async (req, res) => {
  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Thiếu tham số 'date' (YYYY-MM-DD)!" });
  }

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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

    return res.json(dateTasks);
  } catch (error: any) {
    console.error("Lỗi lấy danh sách Tasks:", error);
    return res.status(500).json({ error: error.message || "Không thể tải danh sách công việc hằng ngày." });
  }
});

// 3. POST /api/tasks
app.post("/api/tasks", requireAuth, async (req, res) => {
  const { date, name, type, title, link, status, note } = req.body;

  if (!date || !type || !title) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ các thông tin: ngày, loại và nội dung công việc!" });
  }

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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

    return res.json(newTask);
  } catch (error: any) {
    console.error("Lỗi thêm Task mới:", error);
    return res.status(500).json({ error: error.message || "Không thể tạo công việc mới." });
  }
});

// 4. PUT /api/tasks/:id
app.put("/api/tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { date, name, type, title, link, status, note } = req.body;

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get all task rows
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A1:J1000"
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy công việc cần cập nhật!" });
    }

    const currentTask = rows[rowIndex];
    const nowStr = new Date().toISOString();

    const updatedTask = [
      id,
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

    // Real-row in Google sheets is rowIndex + 1 (1-based index)
    const sheetsRow = rowIndex + 1;

    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `Tasks!A${sheetsRow}:J${sheetsRow}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [updatedTask]
      }
    });

    return res.json({
      id,
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
});

// 5. DELETE /api/tasks/:id
app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A1:A1000"
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy công việc cần xóa!" });
    }

    const sheetId = sheetIdsCache["Tasks"];
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

    return res.json({ success: true, message: "Đã xóa công việc khỏi danh sách." });
  } catch (error: any) {
    console.error("Lỗi xóa Task:", error);
    return res.status(500).json({ error: error.message || "Không thể xóa công việc." });
  }
});

// 6. GET /api/fixed-tasks
app.get("/api/fixed-tasks", requireAuth, async (req, res) => {
  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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

    return res.json(fixedTasks);
  } catch (error: any) {
    console.error("Lỗi lấy FixedTasks:", error);
    return res.status(500).json({ error: error.message || "Không thể tải danh công việc cố định." });
  }
});

// 7. POST /api/fixed-tasks
app.post("/api/fixed-tasks", requireAuth, async (req, res) => {
  const { title, link, active } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Tiêu đề công việc cố định không thể để trống!" });
  }

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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

    return res.json(newFixedTask);
  } catch (error: any) {
    console.error("Lỗi thêm FixedTask:", error);
    return res.status(500).json({ error: error.message || "Không thể thêm công việc cố định." });
  }
});

// 8. PUT /api/fixed-tasks/:id
app.put("/api/fixed-tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, link, active } = req.body;

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "FixedTasks!A1:F500"
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy công việc cố định cần sửa!" });
    }

    const currentFT = rows[rowIndex];
    const nowStr = new Date().toISOString();

    const updatedFT = [
      id,
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

    return res.json({
      id,
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
});

// 9. DELETE /api/fixed-tasks/:id
app.delete("/api/fixed-tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "FixedTasks!A1:A500"
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy công việc cố định cần xóa!" });
    }

    const sheetId = sheetIdsCache["FixedTasks"];
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

    return res.json({ success: true, message: "Đã xóa công việc cố định thành công." });
  } catch (error: any) {
    console.error("Lỗi xóa FixedTask:", error);
    return res.status(500).json({ error: error.message || "Không thể xóa công việc cố định." });
  }
});

// 10. GET /api/settings
app.get("/api/settings", requireAuth, async (req, res) => {
  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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

    return res.json(settings);
  } catch (error: any) {
    console.error("Lỗi khi tải Settings:", error);
    // Return graceful defaults if sheet settings fail or aren't set yet
    return res.json({ reporterName: "Khan" });
  }
});

// 11. PUT /api/settings
app.put("/api/settings", requireAuth, async (req, res) => {
  const config = req.body; // Key-value object, e.g. { reporterName: 'Khan' }

  try {
    await ensureSheets();
    const client = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get current keys
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A1:B100"
    });

    const rows = response.data.values || [];
    
    for (const [key, rawValue] of Object.entries(config)) {
      const value = sanitize(String(rawValue));
      const rowIndex = rows.findIndex((r) => r[0] === key);

      if (rowIndex !== -1) {
        // Update existing key
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
        // Append new key
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

    return res.json({ success: true, settings: config });
  } catch (error: any) {
    console.error("Lỗi khi cập nhật Settings:", error);
    return res.status(500).json({ error: error.message || "Không thể cập nhật cài đặt." });
  }
});

// 12. GET /api/all-tasks (Utility for Dashboard historic stats)
app.get("/api/all-tasks", requireAuth, async (req, res) => {
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

    return res.json(tasks);
  } catch (error: any) {
    console.error("Lỗi khi tải toàn bộ Tasks:", error);
    return res.status(500).json({ error: error.message || "Không thể tải toàn bộ danh sách công việc." });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
