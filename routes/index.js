const express = require('express');
const router = express.Router();

/* GET home page */
router.get("/", function (req, res) {
    res.sendFile("splash.html", {root: "./public"});
});

/* GET home page */
router.get("/play", function (req, res) {
    res.sendFile("game.html", {root: "./public"});
});

module.exports = router;
