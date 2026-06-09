import { google } from "googleapis";

let sheetsClient: any = null;
let sheetIdsCache: { [sheetName: string]: number } = {};

/**
 * Get or initialize Google Sheets client
 */
export async function getSheetsClient() {
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
export function sanitize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:[^\s]*/gi, "");
}

/**
 * Create sheets mapping and ensure table structures exist in Google Sheets
 */
export async function ensureSheets() {
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

export function getSheetId(sheetName: string): number | undefined {
  return sheetIdsCache[sheetName];
}

/**
 * Simple Authentication helper for serverless functions
 */
export function requireAuth(req: any, res: any): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Chưa đăng nhập! Vui lòng nhập mật khẩu mở khóa." });
    return false;
  }

  const token = authHeader.split(" ")[1];
  const serverPassword = process.env.APP_PASSWORD || "default_pass";
  const expectedToken = Buffer.from(serverPassword).toString("base64");

  if (token !== expectedToken) {
    res.status(401).json({ error: "Mật khẩu không hợp lệ hoặc phiên làm việc đã hết hạn!" });
    return false;
  }

  return true;
}

/**
 * App configuration settings helpers
 */
export async function getReporterSettings(): Promise<{ reporterName: string }> {
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
