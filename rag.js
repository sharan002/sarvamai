const axios = require("axios");
const mongoose = require("mongoose");

// Same shape as wpchat-api's Chunk collection - points at the same MongoDB
// database, so this reads the knowledge base already ingested by the
// WhatsApp bot without needing to re-ingest anything here.
const chunkSchema = new mongoose.Schema({
  chunkId: String,
  text: String,
  embedding: [Number],
  hash: String,
  updatedAt: Date,
});

const Chunk = mongoose.model("Chunk", chunkSchema, "chunks");

async function embedText(text) {
  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      input: text,
      model: "text-embedding-3-small",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.data[0].embedding;
}

async function searchRelevantChunks(query, topK = 5) {
  const queryVec = await embedText(query);

  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryVec,
        numCandidates: 200,
        limit: topK,
      },
    },
  ]).exec();

  return results.map((r) => r.text);
}

async function gatherCourseRagContext(userQuery, course, topK = 4) {
  const courseName = (course || "").trim();
  const scoped = courseName ? `${courseName} - ` : "";

  const retrievalQueries = [
    userQuery,
    `${scoped}course highlights`,
    `${scoped}job opportunities`,
    `${scoped}trainer profile`,
    `${scoped}certification`,
    `${scoped}syllabus`,
  ].filter(Boolean);

  const retrievals = await Promise.all(
    retrievalQueries.map((q) => searchRelevantChunks(q, topK))
  );

  const seen = new Set();
  const merged = [];
  for (const arr of retrievals) {
    for (const text of arr) {
      const key = text?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(key);
    }
  }

  return merged;
}

module.exports = { gatherCourseRagContext };
