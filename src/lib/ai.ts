import type { SummaryProvider } from "@/lib/types";

type SummaryInput = {
  title: string;
  service: string;
  status: string;
  description: string;
  notes: string;
};

export async function writeSummary(input: SummaryInput): Promise<{ text: string; provider: SummaryProvider }> {
  const prompt = [
    `Service: ${input.service}`,
    `Status: ${input.status}`,
    `Job: ${input.title}`,
    `Description: ${input.description || "None"}`,
    `Notes:\n${input.notes || "No notes yet."}`,
  ].join("\n");

  if (process.env.GROQ_API_KEY) {
    const text = await groq(prompt);
    if (text) return { text, provider: "groq" };
  }
  if (process.env.GEMINI_API_KEY) {
    const text = await gemini(prompt);
    if (text) return { text, provider: "gemini" };
  }
  return { text: mockSummary(input), provider: "mock" };
}

function mockSummary(input: SummaryInput) {
  const note = input.notes.trim().split("\n").find(Boolean);
  const detail = note ? ` Latest note: ${note}` : ` ${input.description || "No field notes yet."}`;
  return `${input.service} is ${input.status.replaceAll("_", " ")}.${detail}`.slice(0, 420);
}

async function groq(prompt: string) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Write a two-sentence HVAC job summary for a dispatcher. Plain prose. No preamble.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function gemini(prompt: string) {
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Write a two-sentence HVAC job summary for a dispatcher. Plain prose. No preamble.\n\n${prompt}`,
                },
              ],
            },
          ],
        }),
      },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}
