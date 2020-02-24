module.exports = (req, res) => {
    res.send(`Hello from slug ${req.params.slug}`).end()
}