const upload = require("../fileUpload.js");
const fs = require("fs");
var cors = require("cors");

const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.ASSISTANT_API;
const vectorStoreId = process.env.VECTOR_ID;

const port = 3000;
const app = express();

app.set("secretKey", "alura");
app.use(express.static("public"));
app.use(express.json());
// Configure CORS to allow specific origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5173/knowledge",
    "https://dex.rweb.site",
    "https://dex.rweb.vercel/knowledge",
];

const corsOptions = {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["X-Requested-With", "Content-Type"],
};

app.use(cors(corsOptions));

// app.use(cors({
//     origin: 'https://dex.rweb.site', // Replace with your frontend's origin
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Specify allowed methods
//     credentials: true // If your frontend uses cookies or other credentials
// }));

let threadId;

(async () => {
    try {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
    } catch (error) {
        console.log(error);
    }
})();

async function bot(prompt, threadId) {
    const maximoTentativas = 1;
    let repeticao = 0;

    try {
        const message = await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: prompt,
        });

        let run = await openai.beta.threads.runs.createAndPoll(threadId, {
            assistant_id: assistantId,
        });

        if (run.status === "completed") {
            const messages = await openai.beta.threads.messages.list(
                run.thread_id
            );
            let botResponse = messages.data[0].content[0].text.value;
            botResponse = botResponse.replace(/【\d+:\d+†[a-zA-Z]+】/g, "");
            return botResponse;
        } else {
            return `O status do GPT é: ${run.status} falho :()`;
        }
    } catch (erro) {
        repeticao += 1;
        if (repeticao >= maximoTentativas) {
            return `Erro no GPT: ${erro}`;
        }
        console.error("Erro de comunicação com OpenAI: ", erro);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

app.get("/api/", (req, res) => {
    res.send("Hello, Express!");
});

app.post("/api/chat", async (req, res) => {
    const prompt = req.body.msg;
    try {
        const resposta = await bot(prompt, threadId);
        res.send(resposta);
    } catch (erro) {
        res.status(500).send(`Erro no GPT: ${erro}`);
    }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
    let response;
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        // Create an array of File objects from the uploaded buffers
        const files = [req.file].map((file) => {
            // Creating a Blob from the buffer
            const blob = new Blob([file.buffer], { type: file.mimetype });
            return new File([blob], file.originalname, { type: file.mimetype });
        });

        // Assuming you have vectorStoreId defined
        await openai.beta.vectorStores.fileBatches.uploadAndPoll(
            vectorStoreId,
            { files } // Pass the array of File objects
        );

        res.status(200).send(
            `Arquivo enviado com sucesso: ${req.file.filename}`
        );
    } catch (error) {
        res.status(500).send(
            `Erro ao fazer upload do arquivo: ${error}`,
            response
        );
    }
});

app.post("/api/file_retrieval", async (req, res) => {
    try {
        const vectorStoreId = "vs_iAJRUQH8BrdNlelvHCSoIY4H";
        const listResponse = await openai.files.list();
        const fileMap = listResponse.data.reduce((acc, curr) => {
            acc.set(curr.id, curr);
            return acc;
        }, new Map());
        const response = await openai.beta.vectorStores.files.list(
            vectorStoreId
        );
        const file_list = [];
        for await (const file of response.data) {
            file_list.push(fileMap.get(file.id));
        }
        return res.status(200).send(file_list);
    } catch (error) {
        res.status(500).send(`Erro ao recuperar arquivo: ${error}`);
    }
});

app.delete("/api/file_deletion/:id", async (req, res) => {
    try {
        const fileId = req.params.id;

        await openai.files.del(fileId);

        return res.status(200).send("Arquivo deletado com sucesso");
    } catch (error) {
        res.status(500).send(`Erro ao deletar arquivo: ${error}`);
    }
});

app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});