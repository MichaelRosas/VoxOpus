import express from "express";
import { TodoSchema } from "shared";

const exampleTodo = TodoSchema.parse({
  id: "example-1",
  title: "Test the shared package",
  completed: false,
});

console.log(exampleTodo);

const app = express();
const port = 3001;

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});