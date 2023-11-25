const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");
const { resolve } = require("path");
const app = express();
app.use(cors());
const redisClient = Redis.createClient();

const DEFAULT_EXPIRATION = 3600;

app.get("/photos", async (req, res) => {
    const { albumId } = req.query;

    try {
        const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
            const { data } = await axios.get(
                "https://jsonplaceholder.typicode.com/photos",
                { params: { albumId } }
            );
            return data;
        })
        
        return res.json(photos);
        
    } catch (error) {
        console.error("Error fetching photos:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/photos/:id", async (req, res) => {
    try {
        const photo = await getOrSetCache(`photos:${req.params.id}`, async () => {
            const { data } = await axios.get(
                `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
            );
            return data;
        })

        res.json(photo);
    } catch (error) {
        console.error(`Error fetching photo with id ${req.params.id}:`, error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


async function getOrSetCache(key, cb) {
    return new Promise(async (resolve, reject) => {
        const photos = await redisClient.get(key)

        if (photos) {
            console.log("Cache hit")
            resolve(JSON.parse(photos));
        }
        
        const freshData = await cb();
        console.log("Cache miss")
        redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData))
        resolve(freshData);
    })
}


const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`https://localhost:${PORT}`);
    await redisClient.connect();
});

app.get("/", (req, res) => {
    res.send("Hello, this is the root path!");
});
