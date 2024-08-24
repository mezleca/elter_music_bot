import path from "path";
import fs from "fs";
import ytdl from "@ybd-project/ytdl-core";
import ytsearch from "youtube-search-api";

import { fileURLToPath } from 'node:url';
import { scrape } from "./scraper/scraper.js";
    
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), "..");

const { poToken, visitorData } = await scrape();

if (poToken && visitorData) {
    console.log("finished cookie setup");
} else {
    console.log("failed to get cookies");
}

const get_by_name = async (name) => {

    const fetch = await ytsearch.GetListByKeyword(name, false, 3, [{ type: "video" }]);

    for (let i = 0; i < fetch.items.length; i++) {

        const item = fetch.items[i];

        if (!item) {
            continue;
        }

        if (item.isLive) {
            continue;
        }

        return item;
    }

    return null;
};

const get_id = () => {
    return Date.now();
}

export const download_song = (url) => {

    return new Promise(async (resolve, reject) => {

        try {

            const cookies = poToken && visitorData ? { poToken, visitorData } : {};
            const _path = path.resolve(__dirname, "temp");

            ytdl.getInfo(url, { ...cookies }).then(info => {
                
                const filepath = path.join(_path, `${get_id()}.webm`);

                ytdl(url, { filter: 'audioonly', ...cookies, clients: ['web_creator', 'ios', 'android', 'tv_embedded'] })
                .pipe(fs.createWriteStream(filepath))
                .on('finish', () => {
                    resolve({ success: true, file: filepath, title: info.videoDetails.title });
                });

            }).catch(err => {
                console.error('error fetching video info:', err);
                resolve(null);
            });

        } catch (error) {
            console.error('failed to download:', error);
            resolve(null);
        }
    });
};

export const download_by_name = (name) => {

    return new Promise(async (resolve, reject) => {

        try {
  
            const video_data = await get_by_name(name);

            if (!video_data) {
                return resolve(null);
            }

            const cookies = poToken && visitorData ? { poToken, visitorData } : {};
            const url = `https://www.youtube.com/watch?v=${video_data.id}`;
            const _path = path.resolve(__dirname, "temp");
            const filepath = path.join(_path, `${get_id()}.webm`);

            ytdl(url, { filter: 'audioonly', ...cookies, clients: ['web_creator', 'ios', 'android', 'tv_embedded'] })
            .pipe(fs.createWriteStream(filepath))
            .on('finish', () => {
                resolve({ success: true, file: filepath, title: video_data.title });
            });

        } catch (error) {
            console.error('failed to download:', error);
            resolve(null);
        }
    });
};