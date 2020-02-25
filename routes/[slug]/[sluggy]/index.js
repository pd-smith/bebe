export default (req, res) => {
    res.send(`Hello from two slug ${req.params.slug} : ${req.params.sluggy}`).end()
}