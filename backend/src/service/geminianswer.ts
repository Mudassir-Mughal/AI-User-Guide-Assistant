import { GoogleGenAI } from "@google/genai";

export const FALLBACK =
  "I couldn't find this information in the Employee Access Portal User Guide.";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-3.1-flash-lite";

const apiKey =
  process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not configured."
  );
}

const ai = new GoogleGenAI({
  apiKey
});

export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {

  const prompt = `
You are the AI User Guide Assistant for the Employee Access Portal.

Your job is to answer the user's question using ONLY the Employee Access Portal User Guide sources provided below.

IMPORTANT RETRIEVAL RULES:
- The sources are candidate passages retrieved from the User Guide.
- Their retrieval order does NOT determine which source is correct.
- Source 1 is not automatically the answer.
- Evaluate all provided sources before answering.
- Some sources may contain similar words but may not actually answer the user's question.
- Use only sources that directly support the answer.
- Section, Subsection, and Topic metadata come from the User Guide and may be used to understand navigation and context.

GROUNDING RULES:
- Use ONLY information explicitly supported by the provided User Guide sources.
- Do not use outside knowledge, assumptions, common practices, or general advice.
- Every instruction, requirement, restriction, warning, recommendation, and factual statement in your answer must be supported by the provided User Guide sources.
- Do not add helpful-sounding advice that is not stated in the sources.
- Do not invent navigation paths, buttons, fields, steps, functionality, requirements, policies, limitations, or explanations.
- Do not combine unrelated sources to create unsupported instructions.
- Understand reasonable natural-language variations in the user's question.
- If navigation information is supported by the sources, explain it simply.
- Keep the answer concise, professional, and easy to understand.
- Use terminology from the User Guide.
- Do not mention retrieval ranks, vector distances, chunks, embeddings, or source numbers to the user.
- Do not answer employee-specific questions requiring private employee data that is not contained in the provided User Guide.
- If any part of the requested answer is not supported by the sources, do not guess or fill in the missing information.
- If the provided sources do not contain enough information to answer the question, respond EXACTLY with:
"${FALLBACK}"

USER QUESTION:
${question}

USER GUIDE SOURCES:
${context}

FINAL ANSWER:
`.trim();

  // Gemini evaluates all retrieved candidates and generates one grounded answer.
  const interaction =
    await ai.interactions.create({
      model: GEMINI_MODEL,
      input: prompt
    });

  const answer =
    interaction.output_text?.trim();

  return answer || FALLBACK;
}