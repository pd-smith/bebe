export default (req, res) => {
    res.send(`Hello from slug ${req.params.slug}s`).end()
}