const qrcode = require('qrcode-terminal');
const datapay = require('datapay')
module.exports = function(done) {
  if (process.env.address) {
    let message = `
#################################################################################
##
## Welcome to Bitbus, a Bitcoinless Bitcoin Computing Service.
## 
## Here is your Bitcoin Address
## [Look inside .env file for the full keyPair]
##
## Address: ${process.env.address}
##
#################################################################################\n\n`;
    qrcode.generate("bitcoin:"+process.env.address, function(code) {
      message += code;
    })
  } else {
    done("You haven't generated a keypair. Look inside the .env file, or generate a new one with 'bitbus new'", null)
  }
}
