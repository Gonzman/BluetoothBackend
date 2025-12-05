import createApp from "./request";

const app = createApp();

interface leaderboardEntry {
    name: string;
    score: string;
}

const leaderboard: leaderboardEntry[] = []

app.get("/", (_req, res) => {
    return res.send("404 Not Found");
});

app.post("/player", (req, res) => {
    const { name, score } = req.query;
    if (typeof name === "string" && typeof score === "string") {
        const newEntry = { name, score };
        leaderboard.push(newEntry);
        const response = `Player ${name} with score ${score} added.`;
        return res.send(response);
    } else {
        const errorResponse = "Invalid parameters, 'name' and 'score' are required.";
        return res.status(400).send(errorResponse);
    }
});

app.get("/leaderboard", (_req, res) => {
    return res.json(leaderboard);
});

app.post("/reset", (_req, res) => {
    leaderboard.length = 0;
    const response = "Leaderboard has been reset.";
    return res.send(response);
});

app.listen(3123);
