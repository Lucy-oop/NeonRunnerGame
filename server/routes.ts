import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.scores.list.path, async (req, res) => {
    const topScores = await storage.getTopScores();
    res.json(topScores);
  });

  app.post(api.scores.create.path, async (req, res) => {
    try {
      const input = api.scores.create.input.parse(req.body);
      const score = await storage.createScore(input);
      res.status(201).json(score);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  // Seed initial data
  const existingScores = await storage.getTopScores();
  if (existingScores.length === 0) {
    await storage.createScore({ playerName: "RETRO_KING", score: 1000 });
    await storage.createScore({ playerName: "PIXEL_JUMP", score: 850 });
    await storage.createScore({ playerName: "BIT_MASTER", score: 720 });
    await storage.createScore({ playerName: "SQUARE_ONE", score: 500 });
    await storage.createScore({ playerName: "NEWBIE", score: 100 });
  }

  return httpServer;
}
