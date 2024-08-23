import fs from "fs";
import * as dotenv from "dotenv";

import { EmbedBuilder } from "discord.js";
import { download_song, download_by_name } from "./dlp.js";
import { joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, createAudioResource, AudioPlayer, AudioPlayerStatus } from "@discordjs/voice";

dotenv.config();

export const players = new Map();

const isurl = (url) => {

    const pattern =
    /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g;

    return pattern.test(url);
};

const get_song = async (song) => {

    return new Promise(async (resolve, reject) => {

        const is_url = isurl(song); 
        const file_name = is_url ? await download_song(song) : await download_by_name(song);
        
        if (!file_name) {
            return reject(null);
        }

        resolve(file_name);   
    });
};

export const queue_command = (interaction) => {

    const channel = interaction.member.voice.channel;
    const id = channel.id;

    if (!channel) {
        interaction.reply("nao");
        return;
    }

    const current_player = players.get(id);

    if (!current_player) {
        console.log("Something went wrong [current player]", current_player, id);
        return;
    }

    const song_list = [];
    const queue = current_player.queue;

    for (let i = 0; i < queue.length; i++) {

        const song = queue[i];

        if (!song) {
            continue;
        }

        const text = `${i} - ${song.name} by ${song.who}`;
        song_list.push({ name: text, value: '\u200b' });
    }

    // TOFIX: this looks like shit
    const retarded_embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('queue list\n')
        .setThumbnail('https://bigrat.monster/media/bigrat.jpg')
        .addFields(song_list)
        .setTimestamp()

    interaction.reply({ embeds: [retarded_embed]});
};

export const stop_command = (interaction) => {
    
    const channel = interaction.member.voice.channel;
    const id = channel.id;

    if (!channel) {
        interaction.reply("nao");
        return;
    }

    const current_player = players.get(id);

    if (!current_player) {
        console.log("Something went wrong [current player]", current_player, id);
        return;
    }

    current_player.connection.destroy();
    players.delete(id);

    interaction.reply(":+1:");
};

export const pause_command = (interaction) => {

    const channel = interaction.member.voice.channel;
    const id = channel.id;

    if (!channel) {
        interaction.reply("nao");
        return;
    }

    const current_player = players.get(id);

    if (!current_player) {
        console.log("Something went wrong [current player]", current_player, id);
        return;
    }

    /** @type {AudioPlayer} */
    const player = current_player.player;

    current_player.paused = !current_player.paused;

    if (!current_player.paused) {
        player.unpause();
        interaction.reply("pausei a musica galado");
        return;
    }

    interaction.reply(":3");
    
    player.pause(true);
};

export const skip_command = async (interaction, custom_id) => {
    
    /** @type {import("discord.js").VoiceBasedChannel} */
    const channel = interaction.member.voice.channel;
    const id = channel.id;

    if (!channel) {
        interaction.reply("nao");
        return;
    }

    const current_player = players.get(id);

    if (!current_player) {
        console.log("Something went wrong [current player]", current_player, id);
        return;
    }

    const player = current_player.player;

    const next_song = () => {

        const song_id = custom_id ? custom_id : 0;

        if (current_player.queue.length == 0) {
            return;
        }

        if (custom_id && song_id > current_player.queue.length - 1) {
            interaction.reply("id invalido");
            return;
        }

        if (custom_id) {
            current_player.queue.splice(song_id, 1);
            return;
        }

        // remove the temp file
        if (fs.existsSync(current_player.queue[song_id].file)) {
            fs.unlinkSync(current_player.queue[song_id].file);
        }   
        
        current_player.queue.shift();

        if (current_player.queue.length == 0) {
            player.stop();
            console.log("finished queue on", id);
            return;
        }

        const next_resource = current_player.queue[0].resource;
        const { name } = current_player.queue[0];

        // if the resource is invalid
        // skip this one
        if (!next_resource) {
            interaction.reply("ocorreu um erro ao tentar tocar: " + current_player.queue[0].name);
            next_song();
            return;
        }

        // play next song in the queue
        player.play(next_resource);

        interaction.reply(`tocando: ${name}`);
    };
    
    next_song(custom_id);
};

export const music_command = async (interaction, song) => {

    /** @type {import("discord.js").VoiceBasedChannel} */
    const channel = interaction.member.voice.channel;

    if (!channel) {
        console.log("not in a voice channel");
        return;
    }
    
    const id = channel.id;

    // new connection instance
    if (!players.has(id)) {

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
    
        if (!player) {
            console.log("Something went wrong [audio player]");
            return;
        }

        // create a new connection to the voice
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const subscription = connection.subscribe(player);

        if (!subscription) {
            console.log("Something went wrong [subscription]");
            return;
        }

        players.set(id, {
            connection: connection,
            subscription: subscription,
            player: player,
            playing: false,
            paused: false,
            initialized: false,
            queue: []
        });
    }

    const current_player = players.get(id);

    if (!current_player) {
        console.log("Something went wrong [current player]", current_player, id);
        return;
    }

    /** @type {AudioPlayer} */
    const player = current_player.player;
    const audio_file = await get_song(song);

    if (!audio_file) {
        
        interaction.reply("url invalida");

        // if theres no songs in the queue, break the connection
        if (current_player.queue.length == 0) {
            current_player.connection.destroy();
            players.delete(id);
        }

        return;
    }

    const resource = createAudioResource(audio_file.file);

    if (current_player.queue.length > 0) {

        // add the song to queue
        current_player.queue.push({
            resource: resource,
            name: audio_file.title,
            path: audio_file.file,
            who: interaction.author.username
        });

        interaction.reply("Musica adicionada a queue");
        return;
    }

    const delete_player = () => {
        current_player.subscription.unsubscribe();
        current_player.connection.destroy();
        players.delete(id);
    };

    const next_song = () => {

        // remove the temp file
        if (fs.existsSync(current_player.queue[0].file)) {
            fs.unlinkSync(current_player.queue[0].file);
        }   

        current_player.queue.shift();

        if (current_player.queue.length == 0) {
            player.state.status = "idle";
            return;
        }

        const next_resource = current_player.queue[0].resource;

        // if the resource is invalid
        // skip this one
        if (!next_resource) {
            interaction.reply("ocorreu um erro ao tentar dar play em " + current_player.queue[0].name);
            next_song();
            return;
        }

        interaction.reply(`tocando: ${current_player.queue[0].name}`);

        // play next song in the queue
        player.play(next_resource);
    };

    player.on("error", (p) => {
        next_song();
    });

    player.on(AudioPlayerStatus.Idle, () => {

        if (current_player.queue.length > 0) {
            next_song();
            return;
        }  

        delete_player(); 
    });

    current_player.queue.push({
        resouce: resource,
        name: audio_file.title,
        path: audio_file.file,
        who: interaction.author.username
    });

    player.play(resource);
    player.initialized = true;

    interaction.reply(`Tocando: ${current_player.queue[0].name}`);
};