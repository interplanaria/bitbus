const bsv = require('bsv')
const config = require('./bitbus.json')
const seed = config.bitcoin;
const {Peer, Messages, Inventory} = require('bitcore-p2p-cash')
const start = function(handler) {
  let m = new Messages({ Block: bsv.Block, BlockHeader: bsv.BlockHeader, Transaction: bsv.Transaction, MerkleBlock: bsv.MerkleBlock })
  let peer = new Peer({host: seed, messages: m})
  peer.on("disconnect", function() {
    console.log("BITBUS", "peer disconnected")
  })
  peer.on("error", function(e) {
    console.log("BITBUS", "peer error", e)
  })
  peer.on("notfound", function(e) {
    console.log("BITBUS", "peer notfound", e)
  })
  peer.on("reject", function(e) {
    console.log("BITBUS", "peer reject", e)
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
