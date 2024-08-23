import * as dotenv from "dotenv";
import fs from "fs";

import { Client, GatewayIntentBits } from "discord.js";
import { players } from "./music.js";
import { music_command, pause_command, skip_command, stop_command, queue_command } from "./music.js";

dotenv.config();

const intents = [
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
];

export const client = new Client({ intents: intents });

const voice_member_count = async (id) => {

    const channel = await client.channels.fetch(id);

    if (!channel) {
        return { size: 0, channel: null };
    }
  
    if (!channel.isVoiceBased()) { 
        return { size: 0, channel: null };
    }

    return { size: channel.members.size, channel: channel };
};

client.on("ready", (c) => {

    if (!fs.existsSync("./temp/")) {
        console.log("Criando pasta temp");
        fs.mkdirSync("./temp");
    }

    console.log("bot funcionando");
});

client.on('voiceStateUpdate', async (old, _new) => {

    const id = old ? old.channelId : _new.channelId;

    if (!players.has(id)) {
        return;    
    }

    const { size, channel } = await voice_member_count(id);

    if (size > 1) {
        return;
    }

    if (!players.has(id) || !channel.members.has(client.user.id)) {
        return;
    }

    console.log("removing bot from", id);

    const current_player = players.get(id);

    current_player.connection.destroy();
    players.delete(id);
});

/** @param {Message} m */
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

        const args = m.content.split(" ");

        if (args.length > 1 && args[1].length > 0) { 
            const id = args[1];  
            await skip_command(m, id);
            return;
        }

        await skip_command(m);
    }

    if (content == ".stop") {
        await stop_command(m);
    }

    if (content == ".queue") {
        await queue_command(m);
    }
});

if (!process.env?.DCTOKEN) {
    console.clear();
    console.error("[ERROR]: Missing token\nPlease create a .env file with your bot token\nEx:\nDCTOKEN=amwdimiawd...");
    process.exit();
}

client.login(process.env.DCTOKEN);