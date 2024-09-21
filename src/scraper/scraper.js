import puppeteer from "puppeteer";
import fetch from 'node-fetch';
import fs from "fs";
import path from "path";

const id = "jNQXAC9IVRw";

export const isurl = (url) => {

    const pattern =
    /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g;

    return pattern.test(url);
};

// TODO: rewrite this using the whereis command
export const find_path = () => {
    
    const possible_paths = ["/usr/bin/chromium", "/snap/bin/chromium"];

    for (let i = 0; i < possible_paths.length; i++) {
        
        const exist = fs.existsSync(possible_paths[i]);
        if (!exist) {
            continue;
        }

        return possible_paths[i];
    }

    return null;
};

const initialize_browser = async () => {
    
    try {

        let args = {
            headless: true,
            args: ['--no-sandbox']
        };

        const chromium_path = find_path();

        if (process.platform == "linux") {
            
            if (!chromium_path) {
                throw Error("chromium not found");
            }

            args.executablePath = chromium_path;
        }

        const browser = await puppeteer.launch(args);
        return browser;

    } catch (err) {
        throw err;
    }
};

// from: https://github.com/fsholehan/scrape-youtube
export function get_cookies() {

    return new Promise(async (resolve, reject) => {

        const browser = await initialize_browser();
        const page = await browser.newPage();
        const client = await page.createCDPSession();

        try {

            await client.send("Debugger.enable");
            await client.send("Debugger.setAsyncCallStackDepth", { maxDepth: 32 });
            await client.send("Network.enable");

            client.on("Network.requestWillBeSent", async (e) => {

                if (e.request.url.includes("/youtubei/v1/player")) {

                    const jsonData = JSON.parse(e.request.postData);

                    const po_token = jsonData["serviceIntegrityDimensions"]["poToken"];
                    const visitor_data = jsonData["context"]["client"]["visitorData"];

                    if (!po_token || !visitor_data) {
                        return reject("Failed to get token/visitor data");
                    }

                    const cookies = await page.cookies();
                    const cookies_string = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

                    resolve({
                        poToken: po_token,
                        visitorData: visitor_data,
                        cookies: cookies_string
                    });

                    browser.close();
                }
            });

            await page.goto("https://www.youtube.com/embed/" + id, {
                aitUntil: "networkidle2",
            });

            const playButton = await page.$("#movie_player");
            await playButton.click();

        } catch (error) {
            console.error("error scraping youTube data:", error);
            await browser.close();
            return reject(null)
        }
    });
}

export const search_youtube = async (query, limit) => {

    if (!limit) {
        throw Error("missing limit parameter");
    }
  
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
    
    try {

        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const html = await response.text();

        const ytInitialData = html.split('var ytInitialData = ')[1].split(';</script>')[0];
        const data = JSON.parse(ytInitialData);
        
        const videos = [];
        const content = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents.filter(item => item.videoRenderer);

        for (let i = 0; i < content.length; i++) {
            
            const item = content[i];
            const data = item.videoRenderer;

            let is_live = false;

            if (data?.badges) {
                if (data.badges[0].metadataBadgeRenderer.label == "LIVE") {
                    is_live = true;
                }
            }

            if (videos.length == limit) {
                break;
            }

            videos.push({
                title: data.title.runs[0].text,
                url: `https://www.youtube.com/watch?v=${data.videoId}`,
                channel: data.ownerText.runs[0].text,
                live: is_live
            });
        }

        console.log("youtube search:", videos);
      
        return videos;

    } catch (error) {
        console.error("error searching youtube:", error);
        return null;
    }
};

// i mean its only the title but whatever
export const get_metadata = async (url) => {

    try {

        if (!isurl(url)) {
            console.log("metadata: url is not valid");
            return;
        }

        const response = await fetch(url);

        const html = await response.text();

        const ytInitialData = html.split('var ytInitialData = ')[1].split(';</script>')[0];
        const data = JSON.parse(ytInitialData);

        if (!data) {
            console.log("metadata: failed to get metadata", url);
            return "Unknown title";
        }

        const title = data.playerOverlays.playerOverlayRenderer.videoDetails.playerOverlayVideoDetailsRenderer.title.simpleText;
        return title;

    } catch (error) {
        console.error("error getting metadata", error);
        return "Unknown";
    }
};