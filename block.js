const fs = require('fs')
const es = require('event-stream')
const crypto = require('crypto')
const crawl = function(stream, path, cb) {
  let str = stream
    .pipe(es.split())
    .pipe(es.filterSync(function(data) { return !(["[", ",", "]"].includes(data.toString())) }))
    .pipe(es.parse())
  let current_block;
  let fileStream
  str.on('data', function(data) {
    if (!current_block) {
      current_block = data.blk.i;
      fileStream = fs.createWriteStream(path + "/" + data.blk.i + ".json")
      console.log("block = ", current_block)
      fileStream.write("[\n" + JSON.stringify(data))
    } else {
      if (current_block < data.blk.i) {
        fileStream.write("\n]")
        fileStream.close();
        current_block = data.blk.i;
        fileStream = fs.createWriteStream(path + "/" + data.blk.i + ".json")
        console.log("block = ", current_block)
        fileStream.write("[\n" + JSON.stringify(data))
      } else {
        fileStream.write(",\n" + JSON.stringify(data))
      }
    }
  });
  str.on('close', function() {
    console.log("closing")
    fileStream.write("]")
    fileStream.close();
    cb()
  })
}
const save = function(stream, cb) {
  let filestream = fs.createWriteStream(filename, {autoClose: false})
  filestream.write("{\"bus\":")
  stream.on("error", function() {
    console.log("ERror")
    filestream.close();
  })
  stream.on("end", function() {
    console.log("Finish")
    filestream.write("}")
    filestream.close();
  })
  stream.on("close", function() {
    console.log("close")
    filestream.close();
    o.onfinish();
  })
  stream.pipe(filestream)
}
module.exports = {
  crawl: crawl, save: save
}
