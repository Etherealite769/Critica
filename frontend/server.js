const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = process.env.PORT || 3000

// Initialize programmatic Next.js application instance
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling request:', req.url, err)
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    })
      .once('error', (err) => {
        console.error('Server startup error:', err)
        process.exit(1)
      })
      .listen(port, () => {
        console.log(`> Custom Next.js Node.js Server ready on http://${hostname}:${port} [mode: ${dev ? 'development' : 'production'}]`)
      })
  })
  .catch((err) => {
    console.error('Error during app prepare phase:', err)
    process.exit(1)
  })
