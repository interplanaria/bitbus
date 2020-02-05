const Log = require('./log.js')
const fs = require('fs')
const es = require('event-stream')
const JSONStream = require('JSONStream')
const crawl = function(stream, o, path, hashpool, cb) {
  let fileStream = fs.createWriteStream(path + "/mempool.json")
  let str = stream;
  if (o.l && o.l.map) {
    str = str.pipe(JSONStream.parse("*"))
    .on("error", (e) => {
      console.log("* error:", e)
    })
    .pipe(es.map(function(data, callback) {
      let parsed = o.l.map(data)
      let e = {
        $: parsed,
        tx: data.tx
      }
      callback(null, e)
    }))
    .pipe(JSONStream.stringify("[\n", ",\n", "]"))
  }
  str = str.pipe(fileStream)
  str.on('close', function() {
    if (!process.env.DEV) {
      Log.debug("BITBUS", "mempool crawl finished")
      fileStream.close()
      if (hashpool && hashpool.length > 0) {
        // check if the hashes are in the new mempool.json
        fs.readFile(path + "/mempool.json", function(err, content) {
          Log.debug("BITBUS", "mempool = ", hashpool)
          let filtered = hashpool.filter(function(h) {
            return content.includes(h)
          })
          Log.debug("BITBUS", "filtered mempool= ", filtered)
          filtered.forEach(function(h) {
            let log = "MEMPOOL " + h + " " +  Date.now() + "\n"
            fs.appendFileSync(path + "/tape.txt", log);
          })
        })
      }
    }
    cb();
  })
}
module.exports = {
  crawl: crawl
}
