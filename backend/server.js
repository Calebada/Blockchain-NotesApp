const express = require("express");
const cors = require("cors");
const { Blockchain } = require("./blockchain");

const app = express();
const port = process.env.PORT || 5000;
const notesChain = new Blockchain();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "blockchain-notes-api",
  });
});

app.get("/api/chain", (req, res) => {
  res.json({
    valid: notesChain.isChainValid(),
    length: notesChain.chain.length,
    chain: notesChain.chain,
  });
});

app.post("/api/notes", (req, res) => {
  const { author, content } = req.body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({
      error: "Note content is required.",
    });
  }

  const block = notesChain.addNote({
    author: typeof author === "string" ? author.trim() : "anonymous",
    content: content.trim(),
  });

  return res.status(201).json({
    message: "Note secured in a new block.",
    block,
    valid: notesChain.isChainValid(),
  });
});

app.listen(port, () => {
  console.log(`Blockchain Notes API running on http://localhost:${port}`);
});
