const fs=require("fs");
const lib=fs.readFileSync(require.resolve("qrcode-generator/qrcode.js"),"utf8").replace(/<\/script/gi,"<\\/script");
fs.writeFileSync("public/index.html",fs.readFileSync("app.html","utf8").replace("/*QRLIB*/",()=>lib));
console.log("built", fs.statSync("public/index.html").size);
