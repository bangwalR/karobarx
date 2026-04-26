import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    console.log("Testing NVIDIA API...");
    console.log("API Key:", process.env.NVIDIA_API_KEY?.substring(0, 20) + "...");
    console.log("Base URL:", process.env.NVIDIA_BASE_URL);
    console.log("Model:", process.env.NVIDIA_MODEL);

    const openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || "",
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      timeout: 30000, // 30 second timeout
    });

    console.log("Sending test request...");
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-v4-flash",
      messages: [
        { role: "user", content: "Say hello in one word" },
      ],
      temperature: 0.7,
      max_tokens: 50,
      stream: false,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("Response received in", duration, "ms");

    return NextResponse.json({
      success: true,
      response: completion.choices[0]?.message?.content,
      duration: `${duration}ms`,
      usage: completion.usage,
      model: completion.model,
    });
  } catch (err: unknown) {
    console.error("NVIDIA API Test Error:", err);
    
    const error = err as { message?: string; status?: number; code?: string };
    
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error",
      status: error.status,
      code: error.code,
      details: JSON.stringify(err, null, 2),
    }, { status: 500 });
  }
}
