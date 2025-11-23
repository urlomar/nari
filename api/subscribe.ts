// api/subscribe.ts
import { google } from "googleapis";
import { Resend } from "resend";

/**
 * Nari waitlist subscription endpoint.
 *
 * - Accepts POST with JSON: { firstName, lastName, email }
 * - Validates input.
 * - Appends a row to a Google Sheet using a service account.
 * - Sends a confirmation email via Resend (best-effort, non-blocking).
 *
 * Env vars required (set in Vercel):
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 * - GOOGLE_SHEET_ID
 * - GOOGLE_SHEET_RANGE (optional, defaults to "Sheet1!A:D")
 * - RESEND_API_KEY (for confirmation email)
 * - NARI_FROM_EMAIL (optional, defaults to "Nari <nari.curls@gmail.com>")
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
    const range =
      rangeEnv && rangeEnv.trim().length > 0 ? rangeEnv : "Sheet1!A:D";

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
          details:
            "Missing one or more Google env vars (email, private key, or sheet ID).",
        })
      );
      return;
    }

    // Handle escaped newlines if the key is stored with \n sequences
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    // ✅ Correct modern JWT constructor signature
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // 🔑 Explicitly get an access token so we catch auth problems clearly
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

    // Human-readable timestamp in US Eastern Time
    const now = new Date();
    const timestamp =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now) + " ET";

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

    console.log("Subscribe success", {
      sheetId: sheetId.slice(0, 6) + "...",
      range,
      emailHint: email.slice(0, 3) + "***",
      updatedRange: appendResult.data.updates?.updatedRange,
    });

    // 4b) Fire-and-forget confirmation email (do NOT block subscription on failure)
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error(
          "Missing RESEND_API_KEY env var; skipping confirmation email."
        );
      } else {
        const resend = new Resend(resendApiKey);

        const fromEmail =
          process.env.NARI_FROM_EMAIL || "Nari <nari.curls@gmail.com>";

        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Welcome to the Nari waitlist 💫",
          text: [
            `Hi ${firstName},`,
            "",
            `Thank you for joining the Nari waitlist and staying engaged with our journey.`,
            "",
            `We’re building a personalized hair care experience for curls, coils, and kinks — from product recommendations to routine guidance and protective style ideas.`,
            "",
            `You’ll be among the first to hear about new features, early demos, and launch updates.`,
            "",
            `With love for your curls,`,
            `The Nari Team`,
          ].join("\n"),
        });

        console.log("Confirmation email sent", {
          emailHint: email.slice(0, 3) + "***",
        });
      }
    } catch (emailErr: any) {
      console.error("Failed to send confirmation email", {
        message: emailErr?.message ?? String(emailErr),
      });
      // Do not change the response; email is best-effort.
    }

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
