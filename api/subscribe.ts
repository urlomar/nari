// api/subscribe.ts
import { google } from "googleapis";

/**
 * Subscribes a user to the Nari waitlist by appending their info to a Google Sheet.
 * Expects POST with JSON body: { firstName, lastName, email }.
 */
export default async function handler(req: any, res: any) {
  res.setHeader?.("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Ensure body is parsed (in some runtimes req.body may be a string)
  let body = req.body as any;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // ignore; we'll fail validation below
    }
  }

  const { firstName, lastName, email } = (body || {}) as {
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  if (!firstName || !lastName || !email) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        error: "First name, last name, and email are required.",
      })
    );
    return;
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid email format." }));
    return;
  }

  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const range = process.env.GOOGLE_SHEET_RANGE || "Sheet1!A:D";

    if (!clientEmail || !privateKeyRaw || !sheetId) {
      console.error("Missing Google Sheets environment variables", {
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKeyRaw,
        hasSheetId: !!sheetId,
      });
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Server misconfigured." }));
      return;
    }

    // Handle escaped newlines if the key is stored with \n sequences
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        // Columns: FirstName | LastName | Email | Timestamp
        values: [[firstName, lastName, email, timestamp]],
      },
    });

    res.statusCode = 201;
    res.end(JSON.stringify({ ok: true }));
  } catch (err: any) {
    console.error("Subscribe error:", err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: "Failed to subscribe. Please try again later.",
        details: err?.message ?? String(err),
      })
    );
  }
}
