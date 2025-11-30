import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Load existing working JSON from env
    const service = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

    const auth = new google.auth.GoogleAuth({
      credentials: service,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // SAME spreadsheet as Contact Us
    const spreadsheetId =
      "1x24wn1YrNtqw2OwKSb0js9HDN2zlMVdXzmBqDCqHEoE";

    // New tab for chatbot
    const sheetName = "ChatBot";

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            now,
            body.name || "-",
            body.phone || "-",
            body.email || "-",
            body.message || "-",
          ],
        ],
      },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Chatbot Sheet error:", err);
    return Response.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
