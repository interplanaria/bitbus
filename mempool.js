const fs = require('fs')
const es = require('event-stream')
const crawl = function(stream, path, cb) {
  let fileStream = fs.createWriteStream(path + "/mempool.json")
  let str = stream.pipe(fileStream)
  str.on('close', function() {
    console.log("mempool crawl finished")
    fileStream.close()
    cb()
  })
}
module.exports = {
  crawl: crawl
}
