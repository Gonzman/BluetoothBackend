import createApp from "./request";

const app = createApp();

interface leaderboardEntry {
    name: string;
    score: number;
}

const leaderboard: leaderboardEntry[] = []

app.get("/", (_req, res) => {
    return res.send("404 Not Found");
});

app.post("/player", (req, res) => {
    const { name, score } = req.query;
    if (typeof name === "string" && typeof score === "string") {
        leaderboard.push({ name, score: parseInt(score) });
        return res.send(`Player ${name} with score ${score} added.`);
    } else {
        return res.status(400).send("Invalid parameters, 'name' and 'score' are required.");
    }
});

app.get("/leaderboard", (_req, res) => {
    return res.json(leaderboard);
});

app.post("/reset", (_req, res) => {
    leaderboard.length = 0;
    return res.send("Leaderboard has been reset.");
});

app.listen(3123);
