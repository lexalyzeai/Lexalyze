import { NextRequest, NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { text, language, filename } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No document text provided." },
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
      { error: "Analysis failed." },
      { status: 500 }
    );
  }
}