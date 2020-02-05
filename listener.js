const Log = require("./log.js")
const bsv = require('bsv')
const config = require('./bitbus.json')
const {Peer, Messages, Inventory} = require('b2p2p')
const start = function(handler) {
  let m = new Messages({ Block: bsv.Block, BlockHeader: bsv.BlockHeader, Transaction: bsv.Transaction, MerkleBlock: bsv.MerkleBlock })
  let peer = new Peer({host: handler.host, messages: m})
  peer.on("disconnect", function() {
    Log.debug("BITBUS", "peer disconnected. retrying in 10 seconds...")
    setTimeout(function() {
      Log.debug("BITBUS", "retry connect...")
      peer.connect()
    }, 10000)
  })
  peer.on("connect", function(e) {
    Log.debug("BITBUS", "peer connected", e)
  })
  peer.on("error", function(e) {
    Log.debug("BITBUS", "peer error", e)
  })
  peer.on("notfound", function(e) {
    Log.debug("BITBUS", "peer notfound", e)
  })
  peer.on("reject", function(e) {
    Log.debug("BITBUS", "peer reject", e)
  })
  peer.on('inv', function(message) {
    let items = message.inventory.map(function(i) {
      let type = Inventory.TYPE_NAME[i.type];
      return {
        type: type,
        hash: i.hash.toString('hex').match(/.{2}/g).reverse().join("")
      }
    })
    for(let i=0; i<items.length; i++) {
      let item = items[i];
      if (item.type === 'BLOCK') {
        handler.onblock(item.hash)
      } else if (item.type ==='TX') {
        handler.onmempool(item.hash)
      }
    }
  })
  peer.connect()
  return peer;
}
module.exports = {
  start: start
}
