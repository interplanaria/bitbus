const SERVICE = "1LX2igqryqm9zMLaFKFS5Uy4PQ7NYEqQw6"
const Log = require('./log.js')
const datapay = require('datapay')
const gen = function(o) {
  return new Promise(function(resolve, reject) {
    if (process.env.publicKey) {
      datapay.build({
        data: [SERVICE, JSON.stringify(o.q), process.env.publicKey],
      }, function(err, tx) {
        if (err) {
          Log.debug("BITBUS", err)
        } else {
          resolve(tx.toString())
        }
      });
    } else {
      Log.debug("BITBUS", "Please generate a Bitcoin key pair using 'bitbus new'")
    }
  })
}
module.exports = {
  gen: gen
}
