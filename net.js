const Block = require('./block.js')
const Mempool = require('./mempool.js')
const Key = require('./key.js')
const Log = require('./log.js')
const axios = require('axios')
const fs = require('fs')
const crypto = require('crypto')
const peek = function(host, o) {
  axios({
    method: "post",
    url: host + "/peek",
    data: { q: o.q },
  }).then(function(res) {
    Log.debug("BITBUS", res.data)
  })
}
const block = function(host, o, path, cb) {
  if (!process.env.DEV && !fs.existsSync(path)) fs.mkdirSync(path, { recursive: true })
  Key.gen(o).then(function(t) {
    axios({
      method: "post",
      url: host + "/block",
      headers: {
        'Content-type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8'
      },
      data: { tx: t },
      responseType: "stream"
    }).then(function(res) {
      Block.crawl(res.data, o, path, cb)
    }).catch(function(err) {
      Log.debug("BITBUS", err)
    })
  })
}
const mempool = function(host, o, path, hashpool, cb) {
  if (!process.env.DEV && !fs.existsSync(path)) fs.mkdirSync(path, { recursive: true })
  Key.gen(o).then(function(t) {
    axios({
      method: "post",
      url: host + "/mempool",
      data: { tx: t },
      responseType: "stream"
    }).then(function(res) {
      Mempool.crawl(res.data, o, path, hashpool, cb)
    }).catch(function(err) {
      Log.debug("BITBUS", err)
    })
  })
}
module.exports = {
  peek: peek, block: block, mempool: mempool
}
