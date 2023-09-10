const express = require("express");
const multer = require("multer");
const uploads = multer({ dest: "./uploads" });
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
const pdfreader = async (path, keyword) => {
  const buffer = fs.readFileSync(path);
  const data = await pdf(buffer);
  const Sarray = data.text.split("\n");

  const pdfsentence = Sarray.filter((sentence) => {
    const Lsentence = sentence.toLowerCase();
    const Lkeyword = keyword.toLowerCase();
    return Lsentence.includes(Lkeyword);
  });
  return pdfsentence;
};

const excelreader = async (path, keyword) => {
  const buffer = fs.readFileSync(path);
  const workbook = xlsx.read(buffer, { type: "buffer" });

  // Assuming we want to read the first sheet
  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  // Implement keyword search logic

  const keywordMatches = [];

  for (const cellAddress in worksheet) {
    if (worksheet[cellAddress].t === "s") {
      const cellValue = worksheet[cellAddress].v.toLowerCase();
      if (cellValue.includes(keyword.toLowerCase())) {
        keywordMatches.push(cellValue);
      }
    }
  }
  return keywordMatches;
};

const docxreader = async (path, keyword) => {
  const buffer = fs.readFileSync(path);
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value; // Extracted text from DOCX
  const Atexts = text.split("\n");

  const data = Atexts.filter((sentence) => {
    return sentence.toLowerCase().includes(keyword.toLowerCase());
  });

  return data;
};

const filefilter = async (files, keywords) => {
  const response = [];

  for (const file of files) {
    if (file.mimetype === "application/pdf") {
      const data = await pdfreader(file.path, keywords);
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
      const data = await excelreader(file.path, keywords);
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
      const data = await docxreader(file.path, keywords);
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

  try {
    const response = await filefilter(files, keywords);
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
