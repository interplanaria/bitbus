const qrcode = require('qrcode-terminal');
const datapay = require('datapay')
module.exports = function(address, done) {
  if (address) {
    let message = `
#################################################################################
##
## Welcome to Bitbus, a Bitcoinless Bitcoin Computing Service.
## 
## Here is your Bitcoin Address
## [Look inside .env file for the full keyPair]
##
## Address: ${address}
##
#################################################################################\n\n`;
    qrcode.generate("bitcoin:"+address, function(code) {
      message += code;
      datapay.connect('https://bchsvexplorer.com').address(address, function(err, info) {
        if (err) {
          done(err, null)
        } else {
          balance = info.balance
          message += ("\n\nbalance: " + info.balance + "\n")
          message += ("\nOption 1. Charge the address with QR code, with small amount of Bitcoin SV to get started.\n")
          let payload = {
            "to": address,
            "editable": true,
            "currency": "USD",
            "type": "tip"
          }
          let str = JSON.stringify(payload);
          let b64 = Buffer.from(str).toString("base64");
          let url = "https://button.bitdb.network/#" + b64;
          message += ("Option 2. Charge with Moneybutton:\n" + url + "\n");
          done(null, message)
        }
      });
    })
  } else {
    done("You haven't generated a keypair. Look inside the .env file, or generate a new one with 'bitbus new'", null)
  }
}
