import puppeteer from "puppeteer";

const id = "jNQXAC9IVRw";

// from: https://github.com/fsholehan/scrape-youtube

export function scrape() {

    return new Promise(async (resolve, reject) => {

        const browser = await puppeteer.launch({ headless: true });

        try {

            const page = await browser.newPage();
            const client = await page.createCDPSession();

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
