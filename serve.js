module.exports = function() {
  const app = express()
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
  return app
}
