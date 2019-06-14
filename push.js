require('dotenv').config()
const BITCOM = "15TaTqiH6NNUHPCudLaVQMDa5eEErmvvAC"
const datapay = require('datapay')
module.exports = function(filename) {
  let j = require(process.cwd() + '/' + filename)
  let s = JSON.stringify(j)
  datapay.send({
    data: [BITCOM, "push", s],
    pay: { key: process.env.privateKey }
  }, function(err, tx) {
    if (err) {
      console.log("BITBUS", err)
    } else {
      console.log("# Successfully published to Bitbus Network!")
      console.log("# To browse the network visit https://bitbus.network, or run:")
      console.log("")
      console.log("bitbus ls")
      console.log("") 
      console.log("# To use, run:") 
      console.log("") 
      console.log("bitbus pull " + tx)
      console.log("") 
    }
  });
}
