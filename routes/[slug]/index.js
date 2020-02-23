module.exports = (req, res) => {
    res.send(`Hello ${req.params.slug}`).end()
}