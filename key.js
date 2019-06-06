require('dotenv').config()
const SERVICE = "1LX2igqryqm9zMLaFKFS5Uy4PQ7NYEqQw6"
const datapay = require('datapay')
const gen = function(o) {
  return new Promise(function(resolve, reject) {
    if (process.env.publicKey) {
      datapay.build({
        data: [SERVICE, JSON.stringify(o.q), process.env.publicKey],
        pay: { key: process.env.privateKey, to: [{ address: SERVICE, value: 0 }] }
      }, function(err, tx) {
        if (err) {
          console.log(err)
        } else {
          resolve(tx.toString())
        }
      });
    } else {
      console.log("Please generate a Bitcoin key pair using 'bitbus new'")
    }
  })
}
module.exports = {
  gen: gen
}
