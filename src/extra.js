import * as dotenv from "dotenv";
import { Message } from "discord.js";

dotenv.config();

/** @param {Message} interaction*/
export const clean_channel = async (interaction) => {
    
    const current_channel = interaction.guild.channels.cache.get(interaction.channelId);

    // make sure the old channel is still valid
    if (!current_channel) {
        interaction.reply("channel not found");
        return;
    }

    // delete it :3
    await current_channel.delete("cleaned");
    
    // create a new channel using the old_perms
    const new_channel = await current_channel.guild.channels.create({
        name: current_channel.name,
        type: current_channel.type,
        parent: current_channel.parent,
        permissionOverwrites: current_channel.permissionOverwrites.cache
    });

    // let the user know
    new_channel.send('canal limpo :+1:');
};