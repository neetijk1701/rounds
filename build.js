const fs=require("fs"),crypto=require("crypto");
const {minify}=require("terser");
(async()=>{
  const esc=s=>s.replace(/<\/script/gi,"<\\/script");
  const qr=esc(fs.readFileSync(require.resolve("qrcode-generator/qrcode.js"),"utf8"));
  const scan=esc((await minify(fs.readFileSync(require.resolve("jsqr/dist/jsQR.js"),"utf8"))).code);
  let out=fs.readFileSync("app.html","utf8").replace("/*QRLIB*/",()=>qr).replace("/*QRSCAN*/",()=>scan).replace("/*MICU*/",()=>fs.readFileSync("micu.js","utf8"));
  // Replace 'unsafe-inline' for scripts with hashes of the exact inline scripts, so injected script can't run.
  const hashes=[...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>`'sha256-${crypto.createHash("sha256").update(m[1],"utf8").digest("base64")}'`);
  const src="script-src "+hashes.join(" ");
  if(!out.includes("script-src 'unsafe-inline'"))throw new Error("CSP marker missing");
  out=out.replace("script-src 'unsafe-inline'",src);
  fs.writeFileSync("public/index.html",out);
  const h=fs.readFileSync("public/_headers","utf8").replace(/script-src [^;]*;/,src+";");
  fs.writeFileSync("public/_headers",h);
  console.log("built",out.length,"scripts hashed:",hashes.length);
})();
