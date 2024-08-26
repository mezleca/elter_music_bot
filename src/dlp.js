import path from "path";
import ytdl from "@ybd-project/ytdl-core";

import { fileURLToPath } from 'node:url';
import { scrape, search_youtube } from "./scraper/scraper.js";
import { createAudioResource } from "@discordjs/voice";
    
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), "..");

let cookies = {};

(async () => {

    const { poToken, visitorData } = await scrape();

    if (poToken && visitorData) {
        cookies = { poToken, visitorData };
        console.log("finished cookie setup");
    } else {
        console.log("failed to get cookies");
    }
})();

const get_by_name = async (name) => await search_youtube(name, 3) || null;

export const download_song = async (url) => {

    try {

        const info = await ytdl.getInfo(url, { ...cookies });
        const stream = ytdl(url, { 
            filter: 'audioonly', 
            quality: "highest", 
            ...cookies, 
            clients: ['web_creator', 'ios', 'android', 'tv_embedded'],
            highWaterMark: 1 << 25
        });

        const resource = createAudioResource(stream, {
            inputType: 'arbitrary',
            inlineVolume: true
        });

        return { resource, title: info.videoDetails.title };

    } catch (error) {
        console.error('Falha ao criar o stream:', error);
        return null;
    }
};

export const download_by_name = async (name) => {

    try {

        const video_data = await get_by_name(name);
        const video = video_data.find((v) => v.url);

        if (!video_data) {
            return null;
        }
        
        const data = await download_song(video.url);
        
        return data;    

    } catch (error) {
        console.error('Failed to download by name:', error);
        return null;
    }
};