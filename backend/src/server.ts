import "dotenv/config";
import express from "express";
import { zodTextFormat } from "openai/helpers/zod";
import { CommandResultSchema } from "shared";
import { openai } from "./openai.js";

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

  const timeZone: unknown = request.body?.timeZone;

  if (typeof timeZone !== "string" || !timeZone.trim()) {
    response.status(400).json({
      error: "A timezone is required",
    });
    return;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    response.status(400).json({
      error: "Invalid timezone",
    });
    return;
  }

  try {
    const currentTime = new Date().toISOString();

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
        "Resolve relative dates using the supplied current time and timezone.",
        "Return timestamps in ISO 8601 format with Z or an explicit UTC offset.",
        "If a requested time is ambiguous, ask for clarification.",
        "Do not add a reminder simply because a due date was requested.",
        "Never invent missing information.",
      ].join(" "),
      input: JSON.stringify({
        command: command.trim(),
        currentTime,
        timeZone,
      }),
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