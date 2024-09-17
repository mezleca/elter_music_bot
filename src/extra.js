import * as dotenv from "dotenv";
import { Message } from "discord.js";

dotenv.config();

const retarded_messages = ["soy professor de quimica", "el sergio ese corre metiendo noscopes xd jasjdasdjasds", "nossa y como mamas", "<@842353025904410634>"];

/** @param {Message} interaction*/
export const clean_channel = async (interaction) => {
    
    const current_channel = interaction.guild.channels.cache.get(interaction.channelId);

    // make sure the old channel is still valid
    if (!current_channel) {
        interaction.reply("channel not found");
        return;
    }
    
    // create a new channel using the old_perms
    const new_channel = await current_channel.guild.channels.create({
        name: current_channel.name,
        type: current_channel.type,
        parent: current_channel.parent,
        permissionOverwrites: current_channel.permissionOverwrites.cache,
        position: current_channel.position
    });
  
    // delete it :3
    await current_channel.delete("cleaned");
    const random_msg = retarded_messages[Math.floor(Math.random() * retarded_messages.length - 1)];

    if (!random_msg) {
        console.log("invalid random message", random_msg);
        return;
    }
    
    await new_channel.send(random_msg);
};