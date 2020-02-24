module.exports = (req, res) => {
    res.send(`Hello from catch-all: [${req.catch}]`).end()
}