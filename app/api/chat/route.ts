import { DataAPIClient } from "@datastax/astra-db-ts";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTIONS,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPICATION_TOKEN,
} = process.env;

const model = new ChatOllama({
  model: "llama3.1",
  baseUrl: "http://localhost:11434",
});

const client = new DataAPIClient(ASTRA_DB_APPICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, {
  namespace: ASTRA_DB_NAMESPACE,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessge = messages[messages.length - 1].content;

    let docContext = "";

    const embedding = new OllamaEmbeddings({
      model: "mxbai-embed-large",
      baseUrl: "http://127.0.0.1:11434",
    });

    const vector = await embedding.embedQuery(latestMessge);

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTIONS);
      const cursor = collection.find(null, {
        sort: {
          $vector: vector,
        },
        limit: 10,
      });

      const documents = await cursor.toArray();
      const docsMap = documents?.map((doc) => doc.text);

      docContext = JSON.stringify(docsMap);
    } catch (err) {
      console.log("Error querying db: ", err);
    }

    const stringTemplate = `You are an AI assistant who knows everything about Formula One.
    Use the below context to augment what you know about Formuala One racing.
    The context will provide you with the most recent page data from wikipedia,
    the officical F1 website and others.
    If the context dosen't include the information you need answer based on your
    existing knowledge and dont mention the source of your information or what context
    does or dosen't include.
    Format response  using markdown where applicable and don't return images
    --------------
    START CONTEXT
    {doc_context}
    END CONTEXT
    --------------
    QUESTION: {latestMessge}
    --------------
    `;

    const prompt = PromptTemplate.fromTemplate(stringTemplate);

    const formattedPrompt = await prompt.format({
      doc_context: docContext,
      latestMessge: latestMessge,
    });

    const response = await model.invoke(formattedPrompt);

    console.log("Response:", response.content);

    return response.content;
  } catch (err) {
    throw err;
  }
}
