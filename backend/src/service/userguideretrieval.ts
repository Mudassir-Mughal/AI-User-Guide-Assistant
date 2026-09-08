import { pipeline } from "@huggingface/transformers";
import { ChromaClient } from "chromadb";

const MAX_DISTANCE = 1.5;
const TOP_K = 10;

const extractorPromise = pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

const chromaClient = new ChromaClient({
  host:
    process.env.CHROMA_HOST ||
    "localhost",
  port:
    Number(process.env.CHROMA_PORT) ||
    8000,
  ssl: false
});

function isClearlyRelevant(
  bestDistance: number | null
): boolean {
  return (
    bestDistance !== null &&
    bestDistance <= MAX_DISTANCE
  );
}

export async function retrieveUserGuideContext(
  question: string
): Promise<string | null> {

  // MiniLM is loaded once and reused for all user questions.
  const extractor =
    await extractorPromise;

  const questionOutput =
    await extractor(question, {
      pooling: "mean",
      normalize: true
    });

  const questionEmbedding =
    Array.from(
      questionOutput.data
    ) as number[];

  const collection =
    await chromaClient.getCollection({
      name: "employee_user_guide"
    });

  const results =
    await collection.query({
      queryEmbeddings: [
        questionEmbedding
      ],
      nResults: TOP_K
    });

  const documents =
    results.documents?.[0] ?? [];

  const distances =
    results.distances?.[0] ?? [];

  const metadatas =
    results.metadatas?.[0] ?? [];

  const bestDistance =
    distances.length > 0
      ? distances[0]
      : null;

  // Clearly unrelated questions are rejected before Gemini is called.
  if (
    documents.length === 0 ||
    !isClearlyRelevant(bestDistance)
  ) {
    return null;
  }

  const context = documents
    .map((document, index) => {
      if (!document) {
        return null;
      }

      const metadata =
        metadatas[index];

      return `
SOURCE ${index + 1}

Section:
${metadata?.section ?? "Not specified"}

Subsection:
${metadata?.subsection ?? "Not specified"}

Topic:
${metadata?.topic ?? "Not specified"}

Content:
${document}
`.trim();
    })
    .filter(
      (source): source is string =>
        source !== null
    )
    .join(
      "\n\n--------------------\n\n"
    );

  return context || null;
}