const authAdmin = (req, res, next) => {
    const API_KEY = process.env.ADMIN_API_KEY;
    if (req.headers["x-api-key"] === API_KEY) {
        return next();
    }
    res.status(401).json({ error: "No autorizado" });
};

module.exports = { authAdmin };