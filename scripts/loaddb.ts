import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/ollama";

import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTIONS,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const f1Data = [
  "https://en.wikipedia.org/wiki/Formula_One",
  "https://www.f1-data.com",
  "https://www.formula1.com",
  "https://www.skysports.com/f1",
  "https://www.statsf1.com",
];

const client = new DataAPIClient(ASTRA_DB_APPICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTIONS, {
    vector: {
      dimension: 1024,
      metric: similarityMetric,
    },
  });
  console.log(res);
};

const loadSampleData = async () => {
  const collection = db.collection(ASTRA_DB_COLLECTIONS);
  for await (const url of f1Data) {
    const content = await scrapPage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      const embedding = new OllamaEmbeddings({
        model: "mxbai-embed-large",
        baseUrl: "http://localhost:11434",
      });

      const vector = await embedding.embedQuery(chunk);

      const res = await collection.insertOne({
        $vector: vector,
        text: chunk,
      });
      console.log(res);
    }
  }
};

const scrapPage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });
  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

createCollection().then(() => loadSampleData());
