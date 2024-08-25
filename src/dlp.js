import path from "path";
import fs from "fs";
import ytdl from "@ybd-project/ytdl-core";
import ytsearch from "youtube-search-api";

import { fileURLToPath } from 'node:url';
import { scrape } from "./scraper/scraper.js";
    
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

const get_by_name = async (name) => {
    const fetch = await ytsearch.GetListByKeyword(name, false, 3, [{ type: "video" }]);
    return fetch.items.find(item => item && !item.isLive) || null;
};

const get_id = () => Date.now();

export const download_song = (url) => {

    return new Promise(async (resolve, reject) => {
        
        try {

            const _path = path.resolve(__dirname, "temp");
            const info = await ytdl.getInfo(url, { ...cookies });
            const file_path = path.join(_path, `${get_id()}.webm`);
            
            ytdl(url, { filter: 'audioonly', quality: "highest", ...cookies, clients: ['web_creator', 'ios', 'android', 'tv_embedded'] })
                .pipe(fs.createWriteStream(file_path))
                .on('finish', () => {
                    resolve({ success: true, file: file_path, title: info.videoDetails.title });
                })
                .on('error', (err) => {
                    console.error('error during download:', err);
                    resolve(null);
                });
        } catch (error) {
            console.error('failed to download:', error);
            resolve(null);
        }
    });
};

export const download_by_name = async (name) => {

    try {

        const video_data = await get_by_name(name);

        if (!video_data) {
            return null;
        }
            
        const url = `https://www.youtube.com/watch?v=${video_data.id}`;
        const data = await download_song(url);

        return data;
        
    } catch (error) {
        console.error('Failed to download by name:', error);
        return null;
    }
};