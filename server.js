const upload = require('./fileUpload.js');
const fs = require('fs');

const express = require("express");
const dotenv = require('dotenv');
dotenv.config();

const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = process.env.ASSISTANT_API;
const vectorStoreId = process.env.VECTOR_ID;

const port = 3000;
const app = express();

app.set('secretKey', 'alura');
app.use(express.static("public"));
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

let threadId;

(async () => {
    try {
        const thread = await openai.beta.threads.create()
        threadId = thread.id
    } 
    catch (error) {
        console.log(error)
    }
})();

async function bot(prompt, threadId) {

    const maximoTentativas = 1;
    let repeticao = 0;

    try {
        const message = await openai.beta.threads.messages.create(
            threadId,
            {
              role: "user",
              content: prompt
            }
        );

        let run = await openai.beta.threads.runs.createAndPoll(
            threadId,
            { 
              assistant_id: assistantId
            }
        );

        if (run.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(run.thread_id);
            let botResponse = messages.data[0].content[0].text.value;
            botResponse = botResponse.replace(/【\d+:\d+†[a-zA-Z]+】/g, '');
            return botResponse
          } else {
            return `O status do GPT é: ${run.status} falho :()`;
        }

    } catch (erro) {
        repeticao += 1;
        if (repeticao >= maximoTentativas) {
            return `Erro no GPT: ${erro}`;
        }
        console.error('Erro de comunicação com OpenAI: ', erro);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

app.get("/", (req, res) => {
    res.send("Hello, Express!");
});

app.post("/chat", async (req, res) => {
    const prompt = req.body.msg;
    try {
        const resposta = await bot(prompt, threadId);
        res.send(resposta);
    } catch (erro) {
        res.status(500).send(`Erro no GPT: ${erro}`);
    }
});

app.post("/upload", upload.single('file'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        res.status(200).send(`Arquivo enviado com sucesso: ${req.file.filename}`)
        fileName = req.file.filename;
        // const fileStreams = "uploads/1729732287622-OTHONILTON.docx"].map((path) =>
        //     fs.createReadStream(path)
        // );
        await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, fileStreams)
        console.log("oi")
    } catch (error) {
        res.status(500).send(`Erro ao fazer upload do arquivo: ${error}`)
    }
});

app.post("/file_retrieval", async (req, res) => {
    try {
        const file_list = await openai.files.list();
        return res.status(200).send(file_list.data);
    } catch (error) {
        res.status(500).send(`Erro ao recuperar arquivo: ${error}`)
    }
});

app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
