const bitbus = require("../index")
process.env.publicKey = "test"
process.env.DEV = "true";
bitbus.crawl({
  "bitbus":true,
  "name":"weathersv",
  "from":566470,
  "q": {
    "find": {
      "out.s1":"1LtyME6b5AnMopQrBPLk4FGN8UBuhxKqrn"
    },
    "project": { "out.s2":1, "out.s3": 1 }
  }
})
