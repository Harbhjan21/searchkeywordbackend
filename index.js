const express = require("express");
const multer = require("multer");
// const uploads = multer({ dest: "./uploads" });
const storage = multer.memoryStorage();
const uploads = multer({ storage });
const cors = require("cors");
const pdf = require("pdf-parse");
const xlsx = require("xlsx");
const mammoth = require("mammoth");
const fs = require("fs");
const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("hello");
});
const pdfreader = async (buffer, keyword) => {
  const data = await pdf(buffer);
  const Sarray = data.text.split("\n");

  const pdfsentence = Sarray.filter((sentence) => {
    return keyword.some((keyword) => sentence.includes(keyword));
  });
  return pdfsentence;
};

const excelreader = async (buffer, keyword) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });

  // Assuming we want to read the first sheet
  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  // Implement keyword search logic

  const keywordMatches = [];

  for (const cellAddress in worksheet) {
    if (worksheet[cellAddress].t === "s") {
      const cellValue = worksheet[cellAddress].v;
      if (keyword.some((keyword) => cellValue.includes(keyword))) {
        keywordMatches.push(cellValue);
      }
    }
  }
  return keywordMatches;
};

const docxreader = async (buffer, keyword) => {
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value; // Extracted text from DOCX
  const Atexts = text.split("\n");

  const data = Atexts.filter((sentence) => {
    return keyword.some((keyword) => sentence.includes(keyword));
  });

  return data;
};

const filefilter = async (files, keywords) => {
  const response = [];

  for (const file of files) {
    console.log("file", file);
    if (file.mimetype === "application/pdf") {
      const data = await pdfreader(file.buffer, keywords);
      if (data.length > 0) {
        const ob = {
          filename: file.originalname,
          sentence: [...data],
        };
        response.push(ob);
      }
    }
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      const data = await excelreader(file.buffer, keywords);
      if (data.length > 0) {
        const ob = {
          filename: file.originalname,
          sentence: [...data],
        };
        response.push(ob);
      }
    }
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const data = await docxreader(file.buffer, keywords);
      if (data.length > 0) {
        const ob = {
          filename: file.originalname,
          sentence: [...data],
        };
        response.push(ob);
      }
    }
  }

  return response;
};

app.post("/uploads", uploads.array("files", 3), async (req, res) => {
  const files = req.files;
  const { keywords } = req.body;
  const keywordsArray = keywords.split(",");

  try {
    const response = await filefilter(files, keywordsArray);
    console.log("response", response);
    res.json(response);
  } catch (error) {
    console.error("Error processing files:", error);
    res.status(500).json({ message: "Error processing files." });
  }
});

app.listen(5000, (err) => {
  if (!err) {
    console.log("server is listening at port 5000");
  }
});
