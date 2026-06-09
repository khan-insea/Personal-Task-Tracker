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
 * Check if Google Sheets environment variables are present
 */
export function checkEnvConfig(res: any): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !privateKey || !spreadsheetId) {
    res.status(500).json({
      success: false,
      message: "Missing Google Sheets environment variables"
    });
    return false;
  }
  return true;
}

/**
 * Export helpers required by Vercel serverless specifications
 */
export async function getRows(sheetName: string, range: string = "A2:Z1000"): Promise<any[][]> {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`
  });
  return response.data.values || [];
}

export async function appendRow(sheetName: string, row: any[]): Promise<any> {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  return client.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row]
    }
  });
}

export async function updateRow(sheetName: string, rowIndex: number, row: any[]): Promise<any> {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const endColLetter = rowIndex > 0 && row.length <= 26 ? alphabet[row.length - 1] : "Z";
  return client.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex}:${endColLetter}${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row]
    }
  });
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<any> {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetId = getSheetId(sheetName);
  if (sheetId === undefined) {
    throw new Error(`Sheet "${sheetName}" not found for delete operation.`);
  }
  return client.spreadsheets.batchUpdate({
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
}

export async function ensureSheetHeaders(sheetName: string, headers: string[]): Promise<void> {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await client.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers]
    }
  });
}

export async function readSheet(sheetName: string, range?: string): Promise<any[][]> {
  return getRows(sheetName, range);
}

export async function writeSheet(sheetName: string, range: string, values: any[][]): Promise<any> {
  const client = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  return client.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${range}`,
    valueInputOption: "RAW",
    requestBody: {
      values
    }
  });
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
