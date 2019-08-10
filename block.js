const fs = require('fs')
const es = require('event-stream')
const crypto = require('crypto')
const Log = require('./log')
const writetape = function(current_block, path) {
  let l = "BLOCK " + current_block + " " + Date.now() + "\n"
  fs.appendFileSync(path + "/tape.txt", l);
}
const crawl = function(stream, path, cb) {
  let str = stream
    .pipe(es.split())
    .pipe(es.filterSync(function(data) { return !(["[", ",", "]"].includes(data.toString())) }))
    .pipe(es.parse())
  let current_block;
  let fileStream
  str.on('data', function(data) {
    if (process.env.DEV) {
      Log.debug("BITBUS", data)
    } else {
      if (!current_block) {
        current_block = data.blk.i;
        fileStream = fs.createWriteStream(path + "/" + data.blk.i + ".json")
        Log.debug("BITBUS", "start writing block", current_block)
        fileStream.write("[\n" + JSON.stringify(data))
      } else {
        if (current_block < data.blk.i) {
          fileStream.write("\n]")
          fileStream.close();
          writetape(current_block, path);
          current_block = data.blk.i;
          fileStream = fs.createWriteStream(path + "/" + data.blk.i + ".json")
          Log.debug("BITBUS", "start writing block", current_block)
          fileStream.write("[\n" + JSON.stringify(data))
        } else {
          fileStream.write(",\n" + JSON.stringify(data))
        }
      }
    }
  });
  str.on('error', function(e) {
    Log.debug("BITBUS", e)
    process.exit();
  })
  str.on('close', function() {
    if (current_block === undefined) {
      Log.debug("BITBUS", "finished crawling - no transactions found")
    } else if (!process.env.DEV) {
      Log.debug("BITBUS", "all finished at block " + current_block)
      fileStream.write("]")
      fileStream.close();
      writetape(current_block, path);
    }
    cb()
  })
}
const save = function(stream, cb) {
  let filestream = fs.createWriteStream(filename, {autoClose: false})
  filestream.write("{\"bus\":")
  stream.on("error", function() {
    Log.debug("BITBUS", "stream error")
    filestream.close();
  })
  stream.on("end", function() {
    Log.debug("BITBUS", "stream finish")
    filestream.write("}")
    filestream.close();
  })
  stream.on("close", function() {
    Log.debug("BITBUS", "stream close")
    filestream.close();
    o.onfinish();
  })
  stream.pipe(filestream)
}
module.exports = {
  crawl: crawl, save: save
}
