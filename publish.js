require('dotenv').config()
const path = require('path')
const BITCOM = "15TaTqiH6NNUHPCudLaVQMDa5eEErmvvAC"
const datapay = require('datapay')
module.exports = function(filename) {
  let p = path.resolve(process.cwd(), filename)
  let j = require(p)
  let s = JSON.stringify(j)
  if (!j.name) {
    console.log("The bus file must contain a 'name' attribute")
    return;
  }
  if (!j.description) {
    console.log("The bus file must contain a 'description' attribute")
    return;
  }
  let items = [BITCOM, "publish", s, j.name, j.description]
  datapay.send({
    data: items,
    pay: { key: process.env.privateKey }
  }, function(err, tx) {
    if (err) {
      console.log("BITBUS", err)
    } else {
      console.log("\n###########################################\n")
      console.log("# Successfully published to Bitbus Network!")
      console.log("# To browse the network visit https://bitbus.network, or run:")
      console.log("")
      console.log("  bitbus ls")
      console.log("") 
      console.log("# To use, run:") 
      console.log("") 
      console.log("  bitbus start " + tx)
      console.log("") 
      console.log("###########################################\n")
    }
  });
}
