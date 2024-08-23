import path from "path";
import fs from "fs";
import ytdl from "@ybd-project/ytdl-core";
import ytsh from "yt-search";

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
    
    const data = await ytsh(name);

    if (!data) {
        console.log("failed to find", name);
        return null;
    }

    for (let i = 0; i < data.videos.length; i++) {

        const video = data.videos[i];

        if (!video) {
            continue;
        }

        if (!video?.ago && video.url) {
            return video;
        }

        // ignore streams/premiere
        if (video.ago.includes("Streamed")) {
            continue;
        }

        return video;
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
            const _path = path.resolve(__dirname, "temp");
            const filepath = path.join(_path, `${get_id()}.webm`);

            ytdl(video_data.url, { filter: 'audioonly', ...cookies, clients: ['web_creator', 'ios', 'android', 'tv_embedded'] })
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