module.exports = (req, res, next) => {
    console.log('Hello Index Middleware')
    next();
}