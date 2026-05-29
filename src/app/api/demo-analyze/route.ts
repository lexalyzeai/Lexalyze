import { NextRequest, NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/groq";
import { FRIENDLY_ERRORS } from "@/lib/error-handling";

export async function POST(req: NextRequest) {
  try {
    const { text, language, filename } = await req.json().catch(() => ({ text: "", language: "en", filename: "sample.txt" }));

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: FRIENDLY_ERRORS.validation.message, code: "validation" },
        { status: 400 }
      );
    }

    const result = await analyzeDocument(text, language || "en");

    return NextResponse.json({
      result,
      filename: filename || "sample.txt",
    });
  } catch (err) {
    console.error("Demo analysis error:", err);

    return NextResponse.json(
      { error: FRIENDLY_ERRORS.api_failure.message, code: "api_failure" },
      { status: 500 }
    );
  }
}
