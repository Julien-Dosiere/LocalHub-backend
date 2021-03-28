

/**
 * Setup CORS policy on every response passing through it
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
function myCors(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader("Access-Control-Allow-Headers", "Referer, Origin, X-Requested-With, Content-Type,Accept, x-client-key, x-client-token, x-client-secret, Authorization, Cookie");
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
}

module.exports = myCors;
