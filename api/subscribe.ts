// api/subscribe.ts
import { google } from "googleapis";

/**
 * Nari waitlist subscription endpoint.
 *
 * - Accepts POST with JSON: { firstName, lastName, email }
 * - Validates input.
 * - Appends a row to a Google Sheet using a service account.
 *
 * Env vars required (set in Vercel):
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 * - GOOGLE_SHEET_ID
 * - GOOGLE_SHEET_RANGE (optional, defaults to "Sheet1!A:D")
 */
export default async function handler(req: any, res: any) {
  // Always respond JSON
  res.setHeader?.("Content-Type", "application/json");

  // 1) Method guard
  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // 2) Body parsing with safety
  let body: any = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      // If parsing fails, we'll handle as missing fields below
      body = null;
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

  // 3) Config & auth
  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const rangeEnv = process.env.GOOGLE_SHEET_RANGE;
    const range = rangeEnv && rangeEnv.trim().length > 0 ? rangeEnv : "Sheet1!A:D";

    // Validate critical env vars
    if (!clientEmail || !privateKeyRaw || !sheetId) {
      console.error("Subscribe config error", {
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKeyRaw,
        hasSheetId: !!sheetId,
      });
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error: "Server misconfigured.",
          details: "Missing one or more Google env vars (email, private key, or sheet ID).",
        })
      );
      return;
    }

    // Never log raw key, but we can log length for sanity if needed
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    // Create JWT client for service account
    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    // Explicitly get an access token so we catch auth problems clearly
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
    const timestamp = new Date().toISOString();

    // 4) Append to sheet
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        // Columns: FirstName | LastName | Email | Timestamp
        values: [[firstName, lastName, email, timestamp]],
      },
    });

    // Optional: log a tiny success line (no PII beyond email hint)
    console.log("Subscribe success", {
      sheetId: sheetId.slice(0, 6) + "...",
      range,
      emailHint: email.slice(0, 3) + "***",
      updatedRange: appendResult.data.updates?.updatedRange,
    });

    // 5) Success response
    res.statusCode = 201;
    res.end(JSON.stringify({ ok: true }));
  } catch (err: any) {
    // 6) Centralized error handling with helpful details
    let details = "Unknown error";

    if (err && typeof err === "object") {
      if (err.message) {
        details = err.message;
      } else if ((err as any).response?.data?.error?.message) {
        details = (err as any).response.data.error.message;
      }
    }

    console.error("Subscribe error", {
      message: details,
      // DO NOT log private key or full sheet ID here
      code: (err as any)?.code,
      errors: (err as any)?.errors,
    });

    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: "Failed to subscribe. Please try again later.",
        details,
      })
    );
  }
}
