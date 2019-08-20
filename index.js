#!/usr/bin/env node
const Net = require('./net.js')
const qr = require('./qr')
const Listener = require('./listener')
const Block = require('./block')
const Publish = require('./publish')
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
  return new Promise(function(resolve, reject) {
    let keys = createKey()
    let kp = Object.keys(keys).map(function(k) {
      return k + "=" + keys[k]
    }).join("\n")
    kp += "\nPORT=3007"
    if (fs.existsSync(process.cwd() + "/.env")) {
      console.log("BITBUS", "bitbus .env already exists. Skipping...")
      resolve();
    } else {
      for(let k in keys) {
        process.env[k] = keys[k];
      }
      fs.writeFile(process.cwd() + "/.env", kp, function(err, res) {
        whoami(keys.address, resolve)
      })
    }
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
var pool = [];
const mem = function(o, dir) {
  Net.mempool(o, dir, pool, function() {
    console.log("BITBUS", "finished crawling mempool", JSON.stringify(o))
  })
  pool = [];
}
const listen = function(o) {
  let str = JSON.stringify(o)
  console.log("BITBUS", "listen - start", str)
  let h = crypto.createHash('sha256').update(str).digest('hex');
  let dir = process.cwd() + "/bus/" + h
  const debouncedMem = debounce(mem, 1000);
  let listener = Listener.start({
    onmempool: async function(hash) {
      console.log("BITBUS", "onmempool", hash, Date.now())
      pool.push(hash);
      debouncedMem(o, dir)
    },
    onblock: async function(hash) {
      console.log("BITBUS", "onblock", hash, Date.now())
      let last = await seek(o);
      Net.mempool(o, dir, null, function() {
        console.log("BITBUS", "listen - finished processing mempool", JSON.stringify(o))
        Net.block(last, dir, function() {
          console.log("BITBUS", "listen - finished processing block", JSON.stringify(last))
        })
      })
    }
  })
  listeners.push(listener)
}
const crawl = function(o, payload) {
  console.log("BITBUS", "crawl - start", JSON.stringify(o))
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
    if (!process.env.DEV) {
      fs.mkdirSync(busdir, { recursive: true })
    }
    let dir = busdir + "/" + hash
    console.log("BITBUS", "synchronizing to folder", dir)
    Net.block(last, dir, function() {
      console.log("BITBUS", "crawl - finished processing block")
      Net.mempool(o, dir, null, function() {
        console.log("BITBUS", "crawl - finished processing mempool", JSON.stringify(o))
        resolve(dir)
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
      console.log("BITBUS", "serving " + str + " from " + process.cwd() + "/bus/" + hash)
      hashes.push(hash)
    })
    app.get('/', (req, res) => {
      fs.readdir(process.cwd() + "/bus", function(err, items) {
        let url = req.originalUrl;
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
        let url = req.originalUrl;
        if (items) {
          res.render("show", {
            val: "/b/" + req.params.hash,
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
        let url = "/b/" + req.params.hash + "/" + req.params.filename;
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
        let url = req.originalUrl;
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
const validate = function(config, vmode) {
  let errors = [];
  if (!config.bitbus && vmode !== "build") {
    errors.push("requires a \"bitbus\": 1 key pair")
  }
  if (!config.name && vmode !== "build") {
    errors.push("requires a \"name\" attribute")
  }
  if (config.q) {
    let keys = Object.keys(config.q)
    if (keys.length > 0) {
      // keys must be either 'find' or 'project'
      keys.forEach(function(key) {
        if (!["find", "project"].includes(key)) {
          errors.push("\"q\" currently supports only \"find\" and \"project\"")
        }
      })
    } else {
      errors.push("\"q\" should have \"find\" attribute");
    }
  } else {
    errors.push("requires a 'q' attribute")
  }
  return errors;
}
const start = function(options, cb) {
  glob(process.cwd() + "/twetch.json", async function(er, files) {
    let configs = files.map(function(f) {
      return require(f)
    }).filter(function(f) {
      return f.bitbus
    })
    configs.forEach(function(c) {
      console.log("BITBUS", "Found bus file - ", JSON.stringify(c, null, 2))
    })
    if (configs.length === 0) {
      console.log("BITBUS", "Couldn't find a JSON file with an attribute 'bitbus'")
    }
    for(let i=0; i<configs.length; i++) {
      let v = validate(configs[i])
      if (v.length > 0) {
        console.log(v.join("\n"))
        process.exit();
      }
    }
    for(let i=0; i<configs.length; i++) {
      await crawl(configs[i], options)
    }
    for(let i=0; i<configs.length; i++) {
      listen(configs[i])
    }
    if (cb) cb();
  })
}
const build = async function(payload) {
  let v = validate(payload, "build")
  if (v.length > 0) {
    console.log(v.join("\n"))
    process.exit();
  }
  let busdir = await crawl(payload)
  listen(payload)
  return busdir;
}
const whoami = function(addr, cb) {
  qr(addr, function(err, res) {
    if (err) {
      console.log(err)
    } else {
      console.log(res)
    }
    if (cb) cb();
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
    whoami(process.env.address)
  } else if (cmd === 'publish') {
    if (process.argv.length > 3) {
      let filename = process.argv[3]
      Publish(filename)
    } else {
      console.log("[Syntax]\n")
      console.log("$ bitbus publish [filepath]")
    }
  } else if (cmd === 'ls') {
  }
}
module.exports = {
  init: init,
  crawl: crawl,
  start: start,
  build: build
}
