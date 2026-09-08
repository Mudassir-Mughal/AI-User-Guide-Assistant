import { pipeline } from "@huggingface/transformers";
import { ChromaClient } from "chromadb";

import {
  createSemanticChunks
} from "./semanticguide.js";

import {
  buildStructuredGuide
} from "./structureguide.js";

const COLLECTION_NAME =
  "employee_user_guide";

const CHROMA_HOST =
  process.env.CHROMA_HOST ||
  "localhost";

const CHROMA_PORT =
  Number(process.env.CHROMA_PORT) ||
  8000;

function averageEmbeddings(
  first: number[],
  second: number[]
): number[] {
  return first.map(
    (value, index) =>
      (value + second[index]) / 2
  );
}

function normalizeEmbedding(
  embedding: number[]
): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce(
      (sum, value) =>
        sum + value * value,
      0
    )
  );

  if (magnitude === 0) {
    return embedding;
  }

  return embedding.map(
    value => value / magnitude
  );
}

async function ingestGuide(): Promise<void> {
  console.log(
    "Building semantic chunks..."
  );

  const sections =
    await buildStructuredGuide();

  const chunks =
    createSemanticChunks(sections);

  console.log(
    `Semantic chunks created: ${chunks.length}`
  );

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("Embedding model loaded.");

  const client = new ChromaClient({
    host: CHROMA_HOST,
    port: CHROMA_PORT,
    ssl: false
  });

  try {
    await client.deleteCollection({
      name: COLLECTION_NAME
    });

    console.log(
      "Old Chroma collection deleted."
    );
  } catch {
    console.log(
      "No old collection found."
    );
  }

  const collection =
    await client.createCollection({
      name: COLLECTION_NAME,
      embeddingFunction: null
    });

  console.log(
    "New Chroma collection created."
  );

  for (const chunk of chunks) {
    const headingText = `
${chunk.section}
${chunk.subsection}
${chunk.topic}
`.trim();

    const headingOutput =
      await extractor(headingText, {
        pooling: "mean",
        normalize: true
      });

    const headingEmbedding =
      Array.from(
        headingOutput.data
      ) as number[];

    const contentOutput =
      await extractor(chunk.text, {
        pooling: "mean",
        normalize: true
      });

    const contentEmbedding =
      Array.from(
        contentOutput.data
      ) as number[];

    // Combine topic identity and guide content equally for retrieval.
    const embedding =
      normalizeEmbedding(
        averageEmbeddings(
          headingEmbedding,
          contentEmbedding
        )
      );

    await collection.add({
      ids: [chunk.chunkId],
      documents: [chunk.text],
      embeddings: [embedding],
      metadatas: [
        {
          section: chunk.section,
          subsection: chunk.subsection,
          topic: chunk.topic,
          source: chunk.source
        }
      ]
    });

    console.log(
      `Stored ${chunk.chunkId} | ${chunk.topic}`
    );
  }

  const count =
    await collection.count();

  console.log(
    "\nIngestion completed."
  );

  console.log(
    `Chunks stored in ChromaDB: ${count}`
  );
}

ingestGuide().catch(error => {
  console.error(
    "Ingestion failed:",
    error
  );

  process.exitCode = 1;
});