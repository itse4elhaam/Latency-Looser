const express = require("express");
const axios = require("axios");
const cors = require("cors");

const Redis = require("redis")

const app = express();

app.use(cors());


const redisClient = Redis.createClient();

const DEFAULT_EXPIRATION = 3600;

app.get("/photos", async (req, res) => {
    const { albumId } = req.query;

    try {
        const photos = await redisClient.get(`photos?albumId=${albumId}`)

        if (photos) {
            console.log("Cache hit");
            return res.json(JSON.parse(photos))
        }

        console.log("Cache miss");

        const { data } = await axios.get(
            "https://jsonplaceholder.typicode.com/photos",
            { params: { albumId } }
        );
        redisClient.setEx(`photos?albumId=${albumId}`, DEFAULT_EXPIRATION, JSON.stringify(data))
        res.json(data);
    } catch (error) {
        console.error("Error fetching photos:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/photos/:id", async (req, res) => {
    try {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
        );

        res.json(data);
    } catch (error) {
        console.error(`Error fetching photo with id ${req.params.id}:`, error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`https://localhost:${PORT}`);
    await redisClient.connect();
});

app.get("/", (req, res) => {
    res.send("Hello, this is the root path!");
});
