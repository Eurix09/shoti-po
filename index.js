const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 3000;

const filePath = path.join(__dirname, "cache", "shoti.json");
const videoPath = path.join(__dirname, "cache", "shoti.mp4");

// Middleware for parsing JSON requests
app.use(express.json());

// Helper function to get or initialize the shoti.json file
const getShotiData = () => {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return [];
};

// Helper function to save data to the shoti.json file
const saveShotiData = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Endpoint to add a new URL
app.get("/add/shoti", async (req, res) => {
  const { url, senderID } = req.query;

  const authorizedUsers = ["61562844636633"];
  if (!authorizedUsers.includes(senderID)) {
    return res.status(403).json({ message: "You are not authorized" });
  }

  if (!url) {
    return res.status(400).json({ message: "Missing URL" });
  }

  if (!url.includes("https://vt.tiktok.com/")) {
    return res.status(400).json({ message: "Invalid URL" });
  }

  try {
    let data = getShotiData();

    if (data.includes(url)) {
      return res.status(400).json({ message: "URL already exists in the list", url });
    }

    data.push(url);
    saveShotiData(data);

    res.json({ message: "URL added successfully", url });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: "Error saving URL" });
  }
});

// Endpoint to fetch a random video
app.post("/shoti/vids", async (req, res) => {
  try {
    const data = getShotiData();

    if (data.length === 0) {
      return res.status(404).json({ message: "No URLs available" });
    }

    const randomUrl = data[Math.floor(Math.random() * data.length)];
    const response = await axios.get(`https://tikwm.com/api/?url=${randomUrl}`);
    const videoData = response.data.data;

    const username = videoData.author.unique_id;
    const nickname = videoData.author.nickname;
    const videoUrl = videoData.play;
    const title = videoData.title || "No title available";

    console.log(`Fetched video for user: ${username} (${nickname}), Title: ${title}`);

    // Download the video
    const videoStream = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(videoPath);
    videoStream.data.pipe(writer);

    writer.on("finish", () => {
      res.json({
        message: "Video fetched successfully",
        details: {
          title,
          username,
          nickname,
          videoUrl,
        },
        videoPath, // Path to the saved video
      });
    });

    writer.on("error", (err) => {
      console.error("Error saving video:", err.message);
      res.status(500).json({ message: "Error downloading the video" });
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: "Error fetching video data" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});