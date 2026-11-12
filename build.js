const fs=require("fs");
const {minify}=require("terser");
(async()=>{
  const esc=s=>s.replace(/<\/script/gi,"<\\/script");
  const qr=esc(fs.readFileSync(require.resolve("qrcode-generator/qrcode.js"),"utf8"));
  const scan=esc((await minify(fs.readFileSync(require.resolve("jsqr/dist/jsQR.js"),"utf8"))).code);
  const out=fs.readFileSync("app.html","utf8").replace("/*QRLIB*/",()=>qr).replace("/*QRSCAN*/",()=>scan);
  fs.writeFileSync("public/index.html",out);
  console.log("built",out.length);
})();
