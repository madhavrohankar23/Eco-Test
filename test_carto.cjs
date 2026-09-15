const https = require("https");

function test(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      resolve({ url, status: res.statusCode, type: res.headers["content-type"] });
    }).on("error", (e) => resolve({ url, error: e.message }));
  });
}

async function run() {
  const r1 = await test("https://a.basemaps.cartocdn.com/rastertiles/voyager/13/5828/3616.png");
  const r2 = await test("https://a.basemaps.cartocdn.com/light_all/13/5828/3616.png");
  console.log("Carto results:", [r1, r2]);
}
run();