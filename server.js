// 1️⃣ Cloudinary setup
require("dotenv").config(); // load .env
const cloudinary = require("cloudinary").v2;
const http = require("http");
const formidable = require("formidable");

// ✅ Use CLOUDINARY_URL if set, otherwise fallback
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  });
}

console.log("Cloudinary configured:", !!process.env.CLOUDINARY_URL || !!process.env.CLOUD_NAME);

const ADMIN_PASSWORD = "admin1234";

// 2️⃣ Create server
const server = http.createServer((req, res) => {

  // 🔹 Upload handler
  if (req.url === "/upload" && req.method.toLowerCase() === "post") {
    const form = new formidable.IncomingForm({ multiples: false });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error("Formidable parse error:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error parsing the file.");
      }

      console.log("Files received:", files);

      const file = files.photo; // input name="photo"
      if (!file) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("No file uploaded. Make sure input name='photo'");
      }

      const filePath = file.filepath || file.path;
      if (!filePath) {
        console.error("File path missing!", file);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error: file path not found.");
      }

      console.log("Uploading file from path:", filePath);

      cloudinary.uploader.upload(filePath, { folder: "gallery" }, (err, result) => {
        if (err) {
          console.error("Cloudinary upload error:", err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          return res.end("Error uploading to Cloudinary. Check server logs.");
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Upload Successful</title></head>
            <body style="text-align:center; font-family:Arial;">
              <h1>✅ Upload Successful!</h1>
              <p>Your uploaded photo:</p>
              <img src="${result.secure_url}" style="max-width:600px; border-radius:12px;" />
              <br><br>
              <button onclick="window.location.href='/'">🏠 Home</button>
              <button onclick="window.location.href='/gallery'">🖼 View Gallery</button>
            </body>
          </html>
        `);
      });
    });

    return;
  }

  // 🔹 Gallery page
  if (req.url === "/gallery") {
    cloudinary.api.resources({ type: "upload", prefix: "gallery/", max_results: 30 }, (err, result) => {
      if (err) {
        console.error("Cloudinary gallery error:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error loading gallery.");
      }

      const images = result.resources
        .map(img => `<div><img src="${img.secure_url}" style="max-width:200px; margin:10px; border-radius:10px;"></div>`)
        .join("");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head>
            <title>Gallery</title>
            <style>
              body { font-family: Arial; text-align: center; background: #fafafa; }
              .grid { display: flex; flex-wrap: wrap; justify-content: center; }
              img { box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
              button { margin-top: 20px; padding: 10px 20px; border: none; border-radius: 8px; background: #2196F3; color: white; cursor: pointer; }
              button:hover { background: #1976D2; }
            </style>
          </head>
          <body>
            <h1>🖼 Gallery</h1>
            <div class="grid">${images}</div>
            <button onclick="window.location.href='/'">🏠 Home</button>
          </body>
        </html>
      `);
    });
    return;
  }

  // 🔹 Home page
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <html>
      <head>
        <title>Upload Your Photo</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; background: linear-gradient(135deg, #ffecd2, #fcb69f); margin:0; padding:0; }
          .container { margin-top: 100px; background: white; padding:30px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.2); display:inline-block; }
          h1 { color:#333; }
          input[type=file] { margin: 20px 0; }
          button { padding: 10px 20px; border:none; border-radius:10px; background:#4CAF50; color:white; font-size:16px; cursor:pointer; }
          button:hover { background:#45a049; transform:scale(1.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hello Sylvester! 🚀</h1>
          <p>Upload your own photo to display it:</p>
          <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="photo" accept="image/*" required />
            <br>
            <button type="submit">Upload 📤</button>
          </form>
          <br>
          <button onclick="window.location.href='/gallery'">🖼 View Gallery</button>
        </div>
      </body>
    </html>
  `);

});

// 🔹 Start server
server.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server running on port", process.env.PORT || 3000);
});
