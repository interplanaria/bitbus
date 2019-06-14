const Block = require('./block.js')
const Mempool = require('./mempool.js')
const Key = require('./key.js')
const axios = require('axios')
const fs = require('fs')
const crypto = require('crypto')
const config = require('./bitbus.json')
const host = config.bitbus;
const peek = function(o) {
  axios({
    method: "post",
    url: host + "/peek",
    data: { q: o.q },
  }).then(function(res) {
    console.log("BITBUS", res.data)
  })
}
const block = function(o, path, cb) {
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
      Block.crawl(res.data, path, cb)
    }).catch(function(err) {
      console.log("BITBUS", err)
    })
  })
}
const mempool = function(o, path, hashpool, cb) {
  if (!process.env.DEV && !fs.existsSync(path)) fs.mkdirSync(path, { recursive: true })
  Key.gen(o).then(function(t) {
    axios({
      method: "post",
      url: host + "/mempool",
      data: { tx: t },
      responseType: "stream"
    }).then(function(res) {
      Mempool.crawl(res.data, path, hashpool, cb)
    }).catch(function(err) {
      console.log("BITBUS", err)
    })
  })
}
module.exports = {
  peek: peek, block: block, mempool: mempool
}
