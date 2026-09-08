import { Router } from "express";
import {
  FALLBACK,
  generateAnswer
} from "../service/geminianswer.js";
import { retrieveUserGuideContext } from "../service/userguideretrieval.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const message = req.body.message;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const question = message.trim();

    const context =
      await retrieveUserGuideContext(question);

    if (!context) {
      return res.json({
        answer: FALLBACK
      });
    }

    const answer =
      await generateAnswer(
        question,
        context
      );

    return res.json({
      answer
    });

  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      error:
        "Something went wrong while processing your question."
    });
  }
});

export default router;