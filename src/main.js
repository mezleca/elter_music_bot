import * as dotenv from "dotenv";
import fs from "fs";

import { Client, GatewayIntentBits } from "discord.js";
import { music_command, pause_command, skip_command, stop_command } from "./music.js";

dotenv.config();

const intents = [
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
];

export const client = new Client({ intents: intents });

client.on("ready", (c) => {

    if (!fs.existsSync("./temp/")) {
        console.log("Criando pasta temp");
        fs.mkdirSync("./temp");
    }

    console.log("bot funcionando");
});

client.on("messageCreate", async (m) => {

    if (m.author.bot) {
        return;
    }

    if (!m.content.startsWith(".")) {
        return;
    }

    const content = (m.content.split(" "))[0];

    if (content == ".ping") {
        m.reply("pong");
    }

    if (content == ".play") {

        const music = (m.content.split(".play"))[1];

        if (!music) {
            m.reply("faltou o nome / url animal");
            return;
        }

        await music_command(m, music);
    }

    if (content == ".pause") {
        await pause_command(m);
    }

    if (content == ".skip") {
        await skip_command(m);
    }

    if (content == ".stop") {
        await stop_command(m);
    }
});

if (!process.env?.DCTOKEN) {
    console.clear();
    console.error("[ERROR]: Missing token\nPlease create a .env file with your bot token\nEx:\nDCTOKEN=amwdimiawd...");
    process.exit();
}

client.login(process.env.DCTOKEN);