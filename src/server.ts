import { createApp } from "./app.js";
import { getConfig } from "./config/env.js";
import { getDatabase } from "./db/database.js";

getDatabase();

const app = createApp();
const config = getConfig();

app.listen(config.port, () => {
  console.log(`Snap escuchando en http://localhost:${config.port}`);
});
