import "dotenv/config";
import express from "express";
import { openai } from "./openai.js";
import { zodTextFormat } from "openai/helpers/zod";
import { CommandResultSchema } from "shared";

const app = express();
const port = 3001;

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/commands", async (request, response) => {
  const command: unknown = request.body?.command;

  if (typeof command !== "string" || !command.trim()) {
    response.status(400).json({
      error: "A non-empty command is required",
    });
    return;
  }

  try {
    const result = await openai.responses.parse({
      model: "gpt-6-luna",
      instructions: [
        "Interpret commands for a task and reminder application.",
        "Currently, only creating tasks is supported.",
        "Return proposed create operations; do not claim to execute them.",
        "Use null for dates or reminders that were not requested.",
        "If clarification is needed, return an empty operations array",
        "and put your question in clarification.",
        "Otherwise, clarification must be null.",
        "For update or delete requests, explain the limitation in clarification.",
        "For relative dates, ask for clarification because current time",
        "and the user's timezone are not provided yet.",
        "Never invent missing information.",
      ].join(" "),
      input: command.trim(),
      text: {
        format: zodTextFormat(CommandResultSchema, "command_result"),
      },
      max_output_tokens: 1000,
    });

    if (result.status !== "completed" || !result.output_parsed) {
      response.status(502).json({
        error: "The model did not return a complete command result",
      });
      return;
    }

    response.json(result.output_parsed);
  } catch (error) {
    console.error("Command interpretation failed:", error);

    response.status(502).json({
      error: "Could not interpret the command",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});