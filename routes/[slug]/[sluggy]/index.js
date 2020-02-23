module.exports = (req, res) => {
    res.send(`Hello ${req.params.slug} : ${req.params.sluggy}`).end()
}