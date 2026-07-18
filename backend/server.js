const path = require("path");
const { loadEnvFile } = require("./src/config/env");
const { createApp } = require("./src/app");

loadEnvFile(path.join(__dirname, ".env"));

const port = process.env.PORT || 5000;
const { app } = createApp();

app.listen(port, () => {
  console.log(`Blockchain Notes API running on http://localhost:${port}`);
});
