#!/usr/bin/env node
const Net = require('./net.js')
const qr = require('./qr')
const Listener = require('./listener')
const Block = require('./block')
const Push = require('./push')
const {Inventory} = require('bitcore-p2p-cash')
const deepcopy = require('deepcopy');
const glob = require('glob')
const fs = require('fs')
const debounce = require('debounce');
const crypto = require('crypto')
const express = require('express')
const bsv = require('bsv')
const app = express()
const createKey = function() {
  let privateKey = new bsv.PrivateKey();
  let address = privateKey.toAddress();
  let pubKey = privateKey.toPublicKey();
  return {privateKey: privateKey.toWIF(), address: address.toString(), publicKey: pubKey.toString()}
}
const init = function() {
  let keys = createKey()
  let kp = Object.keys(keys).map(function(k) {
    return k + "=" + keys[k]
  }).join("\n")
  kp += "\nPORT=3007"
  fs.writeFile(process.cwd() + "/.env", kp, function(err, res) {
    console.log(`
#################################################################################
##
## Welcome to Bitbus, a Bitcoinless Bitcoin Computing Service.
## 
## API Keys have been auto-generated inside .env
## 
## Follow the instruction at https://bitbus.network/docs 
##
#################################################################################\n\n`);
  })
}
var listeners = [];
// Find the last tip
const seek = function(x, cb) {
  let o = deepcopy(x)
  let str = JSON.stringify(x)
  let hash = crypto.createHash('sha256').update(str).digest('hex');
  let dir = process.cwd() + "/bus/" + hash
  return new Promise(function(resolve, reject) {
    fs.readdir(dir, function(err, items) {
      if (items && items.length > 0) {
        let max = -1;
        for(let i=0; i<items.length; i++) {
          if (parseInt(items[i]) > max) {
            max = parseInt(items[i]);
          }
        }
        let modified = o;
        if (max && max > 0) {
          modified.q.find["blk.i"] = { $gte: max }    
        }
        resolve(modified)
      } else {
        resolve(o)
      }
    })
  })
}
const mem = function(o, dir, hash) {
  Net.mempool(o, dir, function() {
    console.log("[MEM NET] finished crawling mempool", JSON.stringify(o))
  })
}
const listen = function(o) {
  let str = JSON.stringify(o)
  let hash = crypto.createHash('sha256').update(str).digest('hex');
  let dir = process.cwd() + "/bus/" + hash
  const debouncedMem = debounce(mem, 10000);
  let listener = Listener.start({
    onmempool: async function(hash) {
      console.log("onmempool", hash, Date.now())
      debouncedMem(o, dir, hash)
    },
    onblock: async function(hash) {
      console.log("onblock", hash, Date.now())
      let last = await seek(o);
      Net.block(last, dir, function() {
        console.log("[Listen NET] finished crawling block", JSON.stringify(last))
      })
      Net.mempool(o, dir, function() {
        console.log("[Listen NET] finished crawling mempool", JSON.stringify(o))
      })
    }
  })
  listeners.push(listener)
}
const crawl = function(o, payload) {
  return new Promise(async function(resolve, reject) {
    let last = deepcopy(o)
    if (payload) {
      if (payload.cmd === 'rewind') {
        if (payload.data) {
          let gte = Math.max(o.from, payload.data)
          last.q.find["blk.i"] = { $gte: gte };
        }
      } 
    } else {
      last = await seek(last);
    }
    if (!last.q.find["blk.i"] && o.from) {
      last.q.find["blk.i"] = { $gte: o.from }
    }
    let str = JSON.stringify(o)
    let hash = crypto.createHash('sha256').update(str).digest('hex');
    let busdir = process.cwd() + "/bus"
    fs.mkdir(busdir, { recursive: true }, (err) => {
      let dir = busdir + "/" + hash
      Net.block(last, dir, function() {
        console.log("block finished")
        Net.mempool(o, dir, function() {
          console.log("[Start NET] finished crawling mempool", JSON.stringify(o))
          resolve()
        })
      })
    })
  })
}
const reset = async function(o) {
  Net.block(o, function() {
    listen(o)
  })
}
const serve = function() {
  app.use(express.static(__dirname + '/public'))
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/views')
  glob(process.cwd() + "/*.json", async function(er, files) {
    let cfigs = files.map(function(f) {
      return require(f)
    }).filter(function(f) {
      return f.bitbus
    })
    let hashes = []
    cfigs.forEach(function(cfig) {
      let str = JSON.stringify(cfig)
      let hash = crypto.createHash('sha256').update(str).digest('hex');
      hashes.push(hash)
    })
    console.log("created " + process.cwd() +"/bus")
    app.get('/', (req, res) => {
      fs.readdir(process.cwd() + "/bus", function(err, items) {
        let url = req.protocol + '://' + req.get('host') + req.originalUrl;
        res.render("home", {
          items: cfigs.map(function(c, index) {
            return {
              filename: (c.name || hashes[index]),
              url: url + "bus/" + hashes[index]
            }
          })
        })
      })
    })
    app.get('/bus/:hash', (req, res) => {
      fs.readdir(process.cwd() + "/bus/" + req.params.hash, function(err, items) {
        let url = req.protocol + '://' + req.get('host') + req.originalUrl;
        if (items) {
          res.render("show", {
            val: req.protocol + "://" + req.get('host') + "/b/" + req.params.hash,
            items: items.reverse().map(function(i) {
              return {
                filename: i,
                url: url + "/" + i
              }
            })
          })
        } else {
          res.status(500).send({error: new Error("error")})
        }
      })
    })
    app.get('/bus/:hash/:filename', (req, res) => {
      let filestream = fs.readFile(process.cwd() + "/bus/" + req.params.hash + "/" + req.params.filename, function(err, r) {
        let url = req.protocol + '://' + req.get('host') + "/b/" + req.params.hash + "/" + req.params.filename;
        res.render("block", {
          val: url,
          content: r
        })
      })
    })
    app.get('/b/:hash/:filename', (req, res) => {
      let filestream = fs.createReadStream(process.cwd() + "/bus/" + req.params.hash + "/" + req.params.filename)
      filestream.on("error", function(e) {
        res.send("")
      });
      filestream.pipe(res)
    })
    app.get('/b/:hash', (req, res) => {
      fs.readdir(process.cwd() + "/bus/" + req.params.hash, function(err, items) {
        let url = req.protocol + '://' + req.get('host') + req.originalUrl;
        res.json({
          items: items.map(function(i) {
            return {
              url: url + i
            }
          })
        })
      })
    })
    const port = (process.env.PORT || 3007)
    app.listen(port, () => {
      console.log("##########################################################")
      console.log("#")
      console.log(`#  Bitbus explorer running at: http://localhost:${port}!`)
      console.log("#")
      console.log("##########################################################")
    })
  })
}
const start = function(options) {
  glob(process.cwd() + "/*.json", async function(er, files) {
    let configs = files.map(function(f) {
      return require(f)
    }).filter(function(f) {
      return f.bitbus
    })
    for(let i=0; i<configs.length; i++) {
      await crawl(configs[i], options)
    }
    for(let i=0; i<configs.length; i++) {
      listen(configs[i])
    }
  })
}
const whoami = function() {
  qr(function(err, res) {
    if (err) {
      console.log(err)
    } else {
      console.log(res)
    }
  })
}
if (process.argv.length > 2) {
  let cmd = process.argv[2].toLowerCase();
  if (cmd === 'rewind') {
    if (process.argv.length > 3) {
      let blk = parseInt(process.argv[3])
      start({ cmd: cmd, data: blk })
    } else {
      start({ cmd: cmd })
    }
  } else if (cmd === 'start') {
    start();
  } else if (cmd === 'new') {
    init();
  } else if (cmd === 'serve') {
    serve();
  } else if (cmd === 'whoami') {
    whoami()
  } else if (cmd === 'push') {
    if (process.argv.length > 3) {
      let filename = process.argv[3]
      Push(filename)
    }
  } else if (cmd === 'ls') {
  }
}
