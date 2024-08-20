const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { protect, admin } = require("../middleware/auth");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();

// Signup route
router.post("/signup", async (req, res) => {
  const { username, password, instrument, role = "player" } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "Username already exists" });
    }

    user = new User({ username, password, instrument, role });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(201).json({
      token,
      user: { id: user._id, username, instrument, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// Admin Signup Route
router.post("/admin-signup", async (req, res) => {
  const { username, password, instrument } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "Username already exists" });
    }

    user = new User({ username, password, instrument, role: "admin" });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(201).json({
      token,
      user: { id: user._id, username, instrument, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    console.log("user:", user);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    console.log("isMatch:", isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Include role in the JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    console.log("token:", token);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username,
        instrument: user.instrument,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Example of a protected admin route
router.get("/admin-dashboard", protect, admin, (req, res) => {
  res.json({ message: "Welcome to the admin dashboard" });
});

// Scraping route
router.get("/scrape-song", async (req, res) => {
  const { songUrl } = req.query;

  try {
    const { data } = await axios.get(songUrl); // Fetch the page HTML
    const $ = cheerio.load(data); // Load the HTML into cheerio

    // Example: Extract song title
    const title = $("h1").text().trim();

    // Example: Extract chords and lyrics
    let chordsAndLyrics = [];
    $("div.songTextRow").each((i, element) => {
      const lyrics = $(element).find(".lyricText").text().trim();
      const chords = $(element).find(".chordText").text().trim();
      chordsAndLyrics.push({ lyrics, chords });
    });

    res.json({ title, chordsAndLyrics });
  } catch (error) {
    console.error("Error scraping the song:", error);
    res.status(500).json({ message: "Error scraping the song" });
  }
});

module.exports = router;
