import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import OpenAI from "openai";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());

app.post("/api/photo-order-ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No image file received.",
      });
    }

    const mimeType = req.file.mimetype;

    if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
      return res.status(400).json({
        error: "Only JPEG and PNG images are supported.",
      });
    }

    const base64Image = req.file.buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "You are extracting a handwritten restaurant supplier order from an image.",
                "Possible items include: Wings, Potato, Tomato, Salsa, Halloumi, Bacon, Dry Tomato, Tender, Tender Prep, Red Onion, Fries.",
                "Return only plain text.",
                "Return one item per line.",
                "Format every line exactly as: ITEM: QUANTITY",
                "Do not add bullets, explanations, headings, units, or extra commentary.",
                "If a handwritten word is close to one of the possible items, normalize it to that item.",
                "If a line is unreadable, omit it.",
                ].join(" "),
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "high",
            },
          ],
        },
      ],
    });

    return res.json({
      text: response.output_text || "",
    });
  } catch (error) {
    console.error("OpenAI OCR route error:", error);

    return res.status(500).json({
      error: "Failed to process image with OpenAI.",
    });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`);
});