const fs = require('fs')
const es = require('event-stream')
const crawl = function(stream, path, cb) {
  let fileStream = fs.createWriteStream(path + "/mempool.json")
  let str = stream.pipe(fileStream)
  str.on('close', function() {
    if (!process.env.DEV) {
      console.log("mempool crawl finished")
      fileStream.close()
      let log = "MEMPOOL " + Date.now() + "\n"
      console.log(log)
      fs.appendFileSync(path + "/log.txt", log);
    }
    cb();
  })
}
module.exports = {
  crawl: crawl
}
