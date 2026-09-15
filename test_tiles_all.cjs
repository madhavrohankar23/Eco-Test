const https = require("https");

function test(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "EcoMoveNagpur/1.0" } }, (res) => {
      resolve({ url: url.slice(0, 45), status: res.statusCode, type: res.headers["content-type"] });
    }).on("error", (e) => resolve({ url: url.slice(0, 45), error: e.message }));
  });
}

async function run() {
  const r1 = await test("https://tile.openstreetmap.org/13/5828/3616.png");
  const r2 = await test("https://a.tile.openstreetmap.fr/hot/13/5828/3616.png");
  const r3 = await test("https://mt1.google.com/vt/lyrs=m&x=5828&y=3616&z=13");
  console.log("Results:", [r1, r2, r3]);
}
run();