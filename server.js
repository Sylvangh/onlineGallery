const http = require("http");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const ADMIN_PASSWORD = "admin1234"; // 🔑 Your admin password

// Create server
const server = http.createServer((req, res) => {
  // ✅ Upload handler
  if (req.url === "/upload" && req.method.toLowerCase() === "post") {
    const form = new formidable.IncomingForm({ multiples: false });
    form.uploadDir = UPLOAD_DIR;
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error uploading file.");
      }

      const file = files.photo;
      if (!file) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("No file uploaded.");
      }

      const oldPath = file[0].filepath;
      const newPath = path.join(UPLOAD_DIR, file[0].originalFilename);

      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          return res.end("Error saving file.");
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head>
              <title>Upload Successful</title>
              <style>
                body { text-align: center; font-family: Arial; background: #f0f0f0; }
                img { max-width: 600px; margin-top: 20px; border-radius: 12px; }
                button { margin-top: 20px; padding: 10px 20px; border: none; border-radius: 8px; background: #4CAF50; color: white; cursor: pointer; }
                button:hover { background: #45a049; }
              </style>
            </head>
            <body>
              <h1>✅ Upload Successful!</h1>
              <p>Your uploaded photo:</p>
              <img src="/uploads/${file[0].originalFilename}" />
              <br>
              <button onclick="window.location.href='/'">🏠 Home</button>
              <button onclick="window.location.href='/gallery'">🖼 View Gallery</button>
            </body>
          </html>
        `);
      });
    });
    return;
  }

  // ✅ Serve uploaded files
  if (req.url.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, req.url);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
      };
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // ✅ Gallery page
  if (req.url === "/gallery") {
    const files = fs.readdirSync(UPLOAD_DIR);
    const images = files
      .map((file) => `<div><img src="/uploads/${file}" style="max-width:200px; margin:10px; border-radius:10px;"></div>`)
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
    return;
  }

  // ✅ Admin login page
  if (req.url === "/admin" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <head>
          <title>Admin Login</title>
          <style>
            body { font-family: Arial; text-align: center; background: #fbe9e7; }
            .container { margin-top: 100px; padding: 30px; background: white; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: inline-block; }
            input { padding: 10px; margin: 10px; border-radius: 8px; border: 1px solid #ccc; }
            button { padding: 10px 20px; border: none; border-radius: 8px; background: #ff5722; color: white; cursor: pointer; }
            button:hover { background: #e64a19; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔑 Admin Login</h1>
            <form action="/admin" method="post">
              <input type="password" name="password" placeholder="Enter Password" required />
              <br>
              <button type="submit">Login</button>
            </form>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // ✅ Handle admin login POST
  if (req.url === "/admin" && req.method.toLowerCase() === "post") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const password = params.get("password");

      if (password === ADMIN_PASSWORD) {
        const files = fs.readdirSync(UPLOAD_DIR);
        const fileList = files
          .map(
            (file) =>
              `<div>
                 <img src="/uploads/${file}" style="max-width:150px; margin:10px; border-radius:10px;">
                 <form action="/delete" method="post" style="display:inline;">
                   <input type="hidden" name="file" value="${file}">
                   <button type="submit" style="background:#f44336; color:white; border:none; padding:5px 10px; border-radius:6px;">🗑 Delete</button>
                 </form>
               </div>`
          )
          .join("");

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head>
              <title>Admin Panel</title>
              <style>
                body { font-family: Arial; text-align: center; background: #f9fbe7; }
                .grid { display: flex; flex-wrap: wrap; justify-content: center; }
              </style>
            </head>
            <body>
              <h1>📂 Admin Panel</h1>
              <div class="grid">${fileList}</div>
              <button onclick="window.location.href='/'">🏠 Home</button>
            </body>
          </html>
        `);
      } else {
        res.writeHead(403, { "Content-Type": "text/html" });
        res.end("<h1>❌ Wrong password</h1><a href='/admin'>Try again</a>");
      }
    });
    return;
  }

  // ✅ Handle file delete
  if (req.url === "/delete" && req.method.toLowerCase() === "post") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const file = params.get("file");
      const filePath = path.join(UPLOAD_DIR, file);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.writeHead(302, { Location: "/admin" });
      res.end();
    });
    return;
  }

  // ✅ Home page
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <html>
      <head>
        <title>Upload Your Photo</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; background: linear-gradient(135deg, #ffecd2, #fcb69f); margin: 0; padding: 0; }
          .container { margin-top: 100px; background: white; padding: 30px; border-radius: 15px; box-shadow: 0px 4px 15px rgba(0,0,0,0.2); display: inline-block; }
          h1 { color: #333; }
          input[type=file] { margin: 20px 0; }
          button { padding: 10px 20px; border: none; border-radius: 10px; background: #4CAF50; color: white; font-size: 16px; cursor: pointer; }
          button:hover { background: #45a049; transform: scale(1.05); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Online Gallery! 🚀</h1>
          <p>Upload your own photo to display it:</p>
          <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="photo" accept="image/*" required />
            <br>
            <button type="submit">Upload 📤</button>
          </form>
          <br>
          <button onclick="window.location.href='/gallery'">🖼 View Gallery</button>
          <button onclick="window.location.href='/admin'">🔑 Admin Login</button>
        </div>
      </body>
    </html>
  `);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("✅ Server running at http://192.168.1.27:3000/");
});
