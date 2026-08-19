// api/send-results.ts
import { google } from "googleapis";
import { Resend } from "resend";
import { SendResultsRequestSchema } from "./_lib/resultsSchema.js";

/**
 * Emails a user their actual scan recommendations, and (only after that
 * email succeeds) logs the request to a "Results" tracking tab plus joins
 * the same waitlist api/subscribe.ts writes to.
 *
 * Deliberately does NOT share a helper file with subscribe.ts for the
 * Google auth boilerplate below — see DECISIONS.md. This is a same-file
 * duplication, same tradeoff already made for api/_lib/schemas.ts vs.
 * src/lib/schemas.ts (CLAUDE.md "Server code boundary"): editing a file
 * described as "deployed and working, do not move" this close to launch is
 * a worse risk than ~15 duplicated lines.
 *
 * Unlike subscribe.ts (where the Sheets write is required and the
 * confirmation email is best-effort), the roles are reversed here: the
 * email IS the deliverable the user is waiting on, so it must succeed or
 * the request fails with a specific, retryable error. The Sheets writes
 * are secondary bookkeeping, attempted only after a successful send, and
 * degrade the same way subscribe.ts's own best-effort email step does
 * (logged, never fails the response) if Sheets is unreachable/misconfigured.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
/** lowercased email -> last-attempt timestamp. Not infrastructure — just enough to stop a retry loop from hammering Resend. */
const recentRequests = new Map<string, number>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  // Cheap prune on every call so this can't grow unbounded — no separate timer needed.
  for (const [key, ts] of recentRequests) {
    if (now - ts > RATE_LIMIT_WINDOW_MS * 5) recentRequests.delete(key);
  }
  const last = recentRequests.get(email);
  return last !== undefined && now - last < RATE_LIMIT_WINDOW_MS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

type ResultsRequest = ReturnType<typeof SendResultsRequestSchema.parse>;
type ResultsCategory = ResultsRequest["recommendations"]["categories"][number];
type ResultsProduct = ResultsCategory["picks"][number];

const RELAXED_LABELS: Record<string, string> = {
  density: "density",
  curlType: "curl type",
  porosity: "porosity",
};

function relaxedNoteHtml(category: ResultsCategory): string {
  if (!category.relaxed || category.picks.length === 0) return "";
  const labels = category.relaxedConstraints.map((c) => RELAXED_LABELS[c] ?? c).join(", ");
  return `<p style="margin:0 0 12px;font-size:13px;color:#9333EA;font-weight:600;">Closest match — no products tagged for your ${escapeHtml(labels)} yet.</p>`;
}

function productRowHtml(product: ResultsProduct): string {
  const priceLine =
    product.price !== null
      ? `<p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#241C30;">${formatPrice(product.price)}</p>`
      : "";
  const buyLine = product.buyLink
    ? `<p style="margin:6px 0 0;"><a href="${escapeHtml(product.buyLink)}" style="color:#9333EA;font-size:13px;font-weight:600;text-decoration:underline;">Buy →</a></p>`
    : "";
  const matchLine = product.matchLine
    ? `<p style="margin:6px 0 0;font-size:12px;color:#5B5566;">${escapeHtml(product.matchLine)}</p>`
    : "";

  return `
    <tr>
      <td style="padding:14px 16px;border:1px solid #ECE7F5;border-radius:12px;display:block;margin-bottom:10px;">
        <p style="margin:0;font-size:15px;font-weight:600;color:#241C30;">${escapeHtml(product.name)}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#5B5566;">${escapeHtml(product.brand)}</p>
        ${priceLine}
        ${matchLine}
        ${buyLine}
      </td>
    </tr>
    <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>`;
}

function categoryHtml(category: ResultsCategory): string {
  const body =
    category.picks.length === 0
      ? `<p style="margin:0 0 12px;font-size:13px;color:#5B5566;">No matches in this category yet — we&rsquo;re adding products.</p>`
      : `${relaxedNoteHtml(category)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${category.picks.map(productRowHtml).join("")}</table>`;

  return `
    <tr><td style="padding:20px 0 8px;">
      <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#241C30;border-bottom:2px solid #F3E8FF;padding-bottom:6px;">${escapeHtml(category.category)}</p>
      ${body}
    </td></tr>`;
}

function buildResultsEmailHtml(recommendations: ResultsRequest["recommendations"]): string {
  const categoriesHtml = recommendations.categories.map(categoryHtml).join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F4FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F4FB;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 8px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#9333EA;">Nari</p>
                <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#241C30;">Your recommendations</h1>
                <p style="margin:0;font-size:14px;color:#5B5566;line-height:1.5;">Built from your diagnostic — here&rsquo;s the full routine, every category, no trimming.</p>
              </td>
            </tr>
            <tr><td style="padding:0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${categoriesHtml}</table>
            </td></tr>
            <tr>
              <td style="padding:24px 28px 32px;border-top:1px solid #ECE7F5;margin-top:12px;">
                <p style="margin:16px 0 0;font-size:12px;color:#5B5566;line-height:1.5;">
                  Your answers were used only to build these recommendations. You&rsquo;ve also been added to our list for
                  launch updates — we&rsquo;ll let you know when Nari opens up.
                </p>
                <p style="margin:16px 0 0;font-size:12px;color:#5B5566;">With love, The Nari Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildResultsEmailText(recommendations: ResultsRequest["recommendations"]): string {
  const lines: string[] = ["Your Nari recommendations", "", "Built from your diagnostic — the full routine, every category, no trimming.", ""];

  for (const category of recommendations.categories) {
    lines.push(`## ${category.category}`);
    if (category.picks.length === 0) {
      lines.push("No matches in this category yet — we're adding products.");
    } else {
      if (category.relaxed) {
        const labels = category.relaxedConstraints.map((c) => RELAXED_LABELS[c] ?? c).join(", ");
        lines.push(`Closest match — no products tagged for your ${labels} yet.`);
      }
      for (const product of category.picks) {
        lines.push(`- ${product.name} (${product.brand})${product.price !== null ? ` — ${formatPrice(product.price)}` : ""}`);
        if (product.matchLine) lines.push(`  ${product.matchLine}`);
        if (product.buyLink) lines.push(`  Buy: ${product.buyLink}`);
      }
    }
    lines.push("");
  }

  lines.push(
    "Your answers were used only to build these recommendations. You've also been added to our list for launch updates.",
    "",
    "With love,",
    "The Nari Team"
  );

  return lines.join("\n");
}

export default async function handler(req: any, res: any) {
  res.setHeader?.("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body: any = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }

  const parsed = SendResultsRequestSchema.safeParse(body);
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        error: errs.email?.[0] ?? "Please check your details and try again.",
      })
    );
    return;
  }

  const { recommendations, curlType, porosity } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  if (isRateLimited(email)) {
    res.statusCode = 429;
    res.end(
      JSON.stringify({
        error: "You just requested your results — check your inbox, or try again in a minute.",
      })
    );
    return;
  }
  recentRequests.set(email, Date.now());

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("send-results config error: missing RESEND_API_KEY");
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Server misconfigured. Please try again later." }));
    return;
  }

  // The email IS the deliverable here (unlike subscribe.ts, where it's
  // best-effort) — a Resend failure must surface to the user as a real,
  // retryable error, never a false success.
  try {
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.NARI_FROM_EMAIL || "Nari <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      replyTo: "nari.curls@gmail.com",
      subject: "Your Nari recommendations 🌿",
      html: buildResultsEmailHtml(recommendations),
      text: buildResultsEmailText(recommendations),
    });

    console.log("Results email sent", { emailHint: email.slice(0, 3) + "***" });
  } catch (err: any) {
    // Allow an immediate retry — this attempt didn't actually deliver anything.
    recentRequests.delete(email);
    console.error("Failed to send results email", { message: err?.message ?? String(err) });
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "We couldn't send your results email. Please try again in a moment." }));
    return;
  }

  // Sheets logging is secondary bookkeeping, attempted only after a
  // confirmed send (per the brief — so the tracking tab genuinely reflects
  // delivered results) — degrades the same way subscribe.ts's own
  // best-effort step does: logged, never flips a successful response to a
  // failure, since the user already got what they came for.
  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKeyRaw || !sheetId) {
      console.error("send-results: missing Google env vars, skipping sheet logging", {
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKeyRaw,
        hasSheetId: !!sheetId,
      });
    } else {
      const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      await auth.authorize();
      const sheets = google.sheets({ version: "v4", auth });

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
        }).format(new Date()) + " ET";

      const productsSent = recommendations.categories.reduce((sum, c) => sum + c.picks.length, 0);

      const resultsRangeEnv = process.env.GOOGLE_RESULTS_RANGE;
      const resultsRange = resultsRangeEnv && resultsRangeEnv.trim().length > 0 ? resultsRangeEnv : "Results!A:E";

      const waitlistRangeEnv = process.env.GOOGLE_SHEET_RANGE;
      const waitlistRange = waitlistRangeEnv && waitlistRangeEnv.trim().length > 0 ? waitlistRangeEnv : "Sheet1!A:E";

      const resultsAppend = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: resultsRange,
        valueInputOption: "RAW",
        requestBody: { values: [[email, curlType || "N/A", porosity || "N/A", String(productsSent), timestamp]] },
      });
      if (!resultsAppend.data.updates?.updatedRange) {
        console.error("send-results: Results sheet append returned no updatedRange", resultsAppend.data);
      }

      // One-directional: results recipients join the waitlist too (same
      // sheet/tab api/subscribe.ts writes to); waitlist signups never get
      // results. No name is collected on this form, so First/Last are
      // blank rather than fabricated — Hair Type gets the real curlType
      // we do have, same column subscribe.ts's own hairType occupies.
      const waitlistAppend = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: waitlistRange,
        valueInputOption: "RAW",
        requestBody: { values: [["", "", email, curlType || "N/A", timestamp]] },
      });
      if (!waitlistAppend.data.updates?.updatedRange) {
        console.error("send-results: waitlist sheet append returned no updatedRange", waitlistAppend.data);
      }

      console.log("send-results: sheet rows written", {
        emailHint: email.slice(0, 3) + "***",
        resultsRange,
        waitlistRange,
      });
    }
  } catch (err: any) {
    console.error("send-results: sheet logging failed (email already delivered)", {
      message: err?.message ?? String(err),
    });
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
}
