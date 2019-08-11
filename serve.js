const Log = require('./log.js')
const path = require('path')
const glob = require('glob')
const express = require('express')
const crypto = require('crypto')
const fs = require('fs')
module.exports = function(buspath) {
  const app = express()
  app.use(express.static(__dirname + '/public'))
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/views')
  glob(process.cwd() + "/*.@(js|json)", async function(er, files) {
    let cfigs = files.map(function(f) {
      return require(f)
    }).filter(function(f) {
      return f.bitbus
    })
    let hashes = []
    cfigs.forEach(function(cfig) {
      let str = JSON.stringify(cfig)
      let hash = crypto.createHash('sha256').update(str).digest('hex');
      let hashpath = path.resolve(buspath, "bus/" + hash)
      Log.debug("BITBUS", "serving " + str + " from " + hashpath)
      hashes.push(hash)
    })
    app.get('/', (req, res) => {
      fs.readdir(path.resolve(buspath, "bus"), function(err, items) {
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
      let hashpath = path.resolve(buspath, "bus/" + req.params.hash)
      fs.readdir(hashpath, function(err, items) {
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
      let filepath = path.resolve(buspath, "bus/" + req.params.hash + "/" + req.params.filename)
      let filestream = fs.readFile(filepath, function(err, r) {
        let url = "/b/" + req.params.hash + "/" + req.params.filename;
        res.render("block", {
          val: url,
          content: r
        })
      })
    })
    app.get('/b/:hash/:filename', (req, res) => {
      let filepath = path.resolve(buspath, "bus/" + req.params.hash + "/" + req.params.filename)
      let filestream = fs.createReadStream(filepath)
      filestream.on("error", function(e) {
        res.send("")
      });
      filestream.pipe(res)
    })
    app.get('/b/:hash', (req, res) => {
      let hashpath = path.resolve(buspath, "bus/" + req.params.hash)
      fs.readdir(hashpath, function(err, items) {
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
      Log.debug("##########################################################")
      Log.debug("#")
      Log.debug(`#  Bitbus explorer running at: http://localhost:${port}!`)
      Log.debug("#")
      Log.debug("##########################################################")
    })
  })
  return app
}
