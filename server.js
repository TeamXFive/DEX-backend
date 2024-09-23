const { loadDataBase } = require('./helpers')

const express = require("express");

const dotenv = require('dotenv');
dotenv.config();


const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const modelo = "gpt-4";

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

const contexto = loadDataBase('dados/base_chamados.txt');

async function bot(prompt) {
    const maximoTentativas = 1;
    let repeticao = 0;

    while (true) {
        try {
            const promptDoSistema = `
                Você é um chatbot que auxilia o time de suporte técnico da Softtek a resolver chamados.
                Você não deve responder perguntas que não sejam relacionadas aos contextos de suporte técnico da Sofftek, se for solicitado para falar de temas fora do suporte da Sofftek, você precisa apenas lembrar o usuário que sua finalidade é de auxilar na resolução dos chamados!
                Você deve gerar respostas utilizando o contexto abaixo.
                #Contexto
                ${contexto}
                Em sua resposta, inclua a solução e o número do chamado de referencia utilizado em sua pesquisa.
            `;
            const response = await openai.chat.completions.create({
                model: modelo,
                messages: [
                    {
                        role: "system",
                        content: promptDoSistema
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 1,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            });
            return response.choices[0].message.content;
        } catch (erro) {
            repeticao += 1;
            if (repeticao >= maximoTentativas) {
                return `Erro no GPT: ${erro}`;
            }
            console.error('Erro de comunicação com OpenAI: ', erro);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

app.get("/", (req, res) => {
    res.send("Hello, Express!");
});

app.post("/chat", async (req, res) => {
    const prompt = req.body.msg;
    try {
        const resposta = await bot(prompt);
        res.send(resposta)
    } catch (erro) {
        res.status(500).send(`Erro no GPT: ${erro}`);
    }
})

app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});