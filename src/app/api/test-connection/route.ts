import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  // Step 1: Env-Check
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !privateKey || !spreadsheetId) {
    const missing = [
      !email && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      !privateKey && "GOOGLE_PRIVATE_KEY",
      !spreadsheetId && "GOOGLE_SHEETS_SPREADSHEET_ID",
    ]
      .filter(Boolean)
      .join(", ");
    return NextResponse.json(
      { ok: false, error: `Missing environment variables: ${missing}`, step: "env-check" },
      { status: 500 }
    );
  }

  // Step 2: Auth-Init + Step 3: API-Call
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId });

    const spreadsheetTitle = response.data.properties?.title ?? "(kein Titel)";
    const sheetNames = (response.data.sheets ?? []).map(
      (s) => s.properties?.title ?? ""
    );

    return NextResponse.json({
      ok: true,
      spreadsheetTitle,
      sheets: sheetNames,
      message: "Verbindung erfolgreich",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), step: "api-call" },
      { status: 500 }
    );
  }
}
