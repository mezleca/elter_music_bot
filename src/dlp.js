import fs from "fs";
import path from "path";
import axios from "axios";

import { get_metadata, search_youtube } from "./scraper/scraper.js";
import { createAudioResource } from "@discordjs/voice";
import { spawn } from "child_process";
import { Readable } from "stream";

const get_by_name = async (name) => await search_youtube(name, 3) || null;
const plataform_info = {
    name: process.platform == "win32" ? "yt-dlp.exe" : "yt-dlp_linux",
    bin_name: process.platform == "win32" ? "dlp.exe" : "dlp"
};

const setup_dlp = () => {

    return new Promise(async (resolve, reject) => {

        const cache_path = path.resolve("./cache");
        const bin_folder = path.resolve("./bin");
        const bin_path = path.join(bin_folder, plataform_info.bin_name);

        // folder checks
        if (!fs.existsSync(cache_path)) {
            fs.mkdirSync(cache_path);
        }

        if (!fs.existsSync(bin_folder)) {
            fs.mkdirSync(bin_folder);
        }

        // check if you already have the binary file downloaded
        if (fs.existsSync(bin_path)) {
            console.log("[LOG] skipping binary download\n[LOG] dlp setup completed");
            return resolve();
        }

        // download ytdlp bin
        const latest_release = await axios.get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
            responseType: "json"
        });

        // get the bin url
        const data = latest_release.data;
        const dlp = data.assets.find((asset) => asset.name == plataform_info.name);

        if (!dlp) {
            throw Error("failed to setup dlp\nReason: unable to find binary url");
        }        

        console.log("[LOG] downloading dlp from", dlp.browser_download_url);
        
        const bin_file = await axios.get(dlp.browser_download_url, {
            method: "GET",
            responseType: "arraybuffer"
        });

        fs.writeFileSync(bin_path, bin_file.data);

        // if you're on linux, im pretty sure you need to do this
        if (process.platform = "linux") {
            exec(`chmod +x ${bin_path}`, (err) => {
                if (err) {
                    throw Error("failed to give perm");
                }
            });
        }

        console.log("[LOG] dlp setup completed");
        resolve();
    });
};

const download_audio_stream = (video_url, test) => {

    return new Promise((resolve, reject) => {

        const cache_dir = path.resolve("./cache");
        const bin_path = path.resolve("./bin", plataform_info.bin_name);

        const yt_dlp_command = [
            video_url,
            "--no-check-certificates",
            "--prefer-free-formats",
            "--add-header", "referer:youtube.com",
            "--add-header", "user-agent:googlebot",
            "-f", "bestaudio",
            "--cache-dir", cache_dir,
            "-N", "4",
            "-o", "-",
        ];

        if (test) {
            console.log("[LOG] testing dlp download", video_url);
        }

        console.log("[LOG] starting download for", video_url);

        const yt_dlp_process = spawn(bin_path, yt_dlp_command);
        const audio_stream = new Readable({
            read() {}
        });

        yt_dlp_process.stdout.on("data", (data) => {
            audio_stream.push(data);
        });

        yt_dlp_process.on("close", (code) => {

            if (code != 0) {
                return reject(new Error(`[ERROR] yt-dlp process exited with code ${code}`));        
            } 

            audio_stream.push(null);

            if (test) {
                console.log("[LOG] test completed");
            } else {
                console.log("[LOG] finished download");
            }
            
            return resolve(audio_stream);
        });

        yt_dlp_process.stderr.on("data", (data) => {

            const error_output = data.toString();

            if (error_output.includes("[ERROR]")) {
                console.error(`[ERROR] ${error_output}`);
            }
        });
    });
};

// setup and make sure everything is working 
await setup_dlp();
await download_audio_stream("https://www.youtube.com/watch?v=x6mj02JpWhY", true);

export const download_song = async (url, t) => {

    try {

        const title = t ? t : await get_metadata(url);
        const stream = await download_audio_stream(url);

        const resource = createAudioResource(stream, {
            inputType: 'arbitrary',
            inlineVolume: true
        });

        return { resource, title: title };

    } catch (error) {
        console.error('failed to create stream:', error);
        return null;
    }
};

export const download_by_name = async (name) => {

    try {

        const video_data = await get_by_name(name);
        const video = video_data.find((v) => v.url && v.live == false);

        if (!video) {
            return null;
        }

        console.log("found song", video);
        
        const data = await download_song(video.url, video.title);
        
        return data;    

    } catch (error) {
        console.error('Failed to download by name:', error);
        return null;
    }
};