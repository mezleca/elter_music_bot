import puppeteer from "puppeteer";
import fetch from 'node-fetch';

const id = "jNQXAC9IVRw";

const pup = {
    browser: null
};

const initialize_pup = async () => {  
    try {
        pup.browser = await puppeteer.launch({ headless: true });
    } catch(err) {
        throw Error(err);
    }
};

await initialize_pup();

// from: https://github.com/fsholehan/scrape-youtube
export function scrape() {

    return new Promise(async (resolve, reject) => {

        if (!pup.browser) {
            throw Error("pup is not initialized");
        }

        const browser = pup.browser;
        const page = await browser.newPage();
        const client = await page.createCDPSession();

        try {

            await client.send("Debugger.enable");
            await client.send("Debugger.setAsyncCallStackDepth", { maxDepth: 32 });
            await client.send("Network.enable");

            client.on("Network.requestWillBeSent", (e) => {

                if (e.request.url.includes("/youtubei/v1/player")) {

                    const jsonData = JSON.parse(e.request.postData);

                    const po_token = jsonData["serviceIntegrityDimensions"]["poToken"];
                    const visitor_data = jsonData["context"]["client"]["visitorData"];

                    if (!po_token || !visitor_data) {
                        return reject("Failed to get token/visitor data");
                    }

                    resolve({
                        poToken: po_token,
                        visitorData: visitor_data
                    });

                    page.close();
                }
            });

            await page.goto("https://www.youtube.com/embed/" + id, {
                aitUntil: "networkidle2",
            });

            const playButton = await page.$("#movie_player");
            await playButton.click();

        } catch (error) {
            console.error("error scraping youTube data:", error);
            await page.close();
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

        const response = await fetch(url);
        const html = await response.text();

        const ytInitialData = html.split('var ytInitialData = ')[1].split(';</script>')[0];
        const data = JSON.parse(ytInitialData);
        
        const videos = [];
        const content = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents.filter(item => item.videoRenderer);
        
        for (let i = 0; i < content.length; i++) {
            
            const item = content[i];
            const data = item.videoRenderer;

            if (videos.length == limit) {
                break;
            }

            videos.push({
                title: data.title.runs[0].text,
                url: `https://www.youtube.com/watch?v=${data.videoId}`,
                channel: data.ownerText.runs[0].text
            });
        }
      
        return videos;

    } catch (error) {
        console.error("error searching youtube:", error);
        throw error;
    }
};