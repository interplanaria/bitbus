const fs = require('fs')
const debug = function(...args) {
  if (process.env.DEBUG && process.env.DEBUG === "true") {
    console.log(...args)
  }
}
module.exports = {
  debug: debug
}
