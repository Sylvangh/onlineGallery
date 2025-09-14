// Load environment variables first
require('dotenv').config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;

// Confirm Cloudinary config
console.log('Cloudinary configured for:', process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const ADMIN_PASSWORD = "admin1234";
const DATA_FILE = path.join(__dirname, "images.json");

// Load or create images.json to store uploaded image URLs
let images = [];
if (fs.existsSync(DATA_FILE)) {
    images = JSON.parse(fs.readFileSync(DATA_FILE));
}

// HTML template wrapper with CSS
function renderPage(title, content) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(120deg, #f6d365, #fda085);
          margin: 0; padding: 20px;
          text-align: center;
        }
        h1 { color: #333; }
        form { margin: 20px 0; }
        input[type="file"], input[type="password"] {
          padding: 10px;
          border: 2px solid #333;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        button {
          padding: 10px 20px;
          border: none;
          background: #333;
          color: #fff;
          border-radius: 8px;
          cursor: pointer;
          transition: 0.3s;
        }
        button:hover { background: #555; }
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .card {
          background: #fff;
          padding: 10px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .card img {
          max-width: 100%;
          border-radius: 8px;
        }
        .delete-link {
          display: inline-block;
          margin-top: 5px;
          padding: 5px 10px;
          background: #e63946;
          color: #fff;
          text-decoration: none;
          border-radius: 6px;
        }
        .delete-link:hover { background: #c82333; }
        a { display: inline-block; margin-top: 15px; color: #333; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

const server = http.createServer((req, res) => {
    if (req.url === "/" && req.method === "GET") {
        // Home page with upload form + gallery
        const galleryHtml = images.map(img => `
            <div class="card">
                <img src="${img.url}">
                <p>${img.original_filename}</p>
            </div>`).join("");

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(renderPage("My Gallery", `
            <h1>📸 My Gallery</h1>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="photo" accept="image/*" required>
                <button type="submit">Upload</button>
            </form>
            <div class="gallery">${galleryHtml}</div>
            <a href="/admin">🔒 Admin Panel</a>
        `));
    } 
    else if (req.url === "/upload" && req.method === "POST") {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                return res.end("Upload failed");
            }

            const file = files.photo[0];
            cloudinary.uploader.upload(file.filepath, { folder: "myGallery" })
                .then(result => {
                    images.push({
                        url: result.secure_url,
                        original_filename: file.originalFilename
                    });
                    fs.writeFileSync(DATA_FILE, JSON.stringify(images, null, 2));

                    res.writeHead(302, { Location: "/" });
                    res.end();
                })
                .catch(error => {
                    console.error(error);
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.end("Cloudinary upload failed");
                });
        });
    } 
    else if (req.url === "/admin" && req.method === "GET") {
        // Admin login
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(renderPage("Admin Login", `
            <h1>🔑 Admin Login</h1>
            <form method="POST" action="/admin">
                <input type="password" name="password" placeholder="Enter password" required>
                <br>
                <button type="submit">Login</button>
            </form>
            <a href="/">🏠 Back to Home</a>
        `));
    } 
    else if (req.url === "/admin" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            const params = new URLSearchParams(body);
            const password = params.get("password");

            if (password === ADMIN_PASSWORD) {
                const fileListHtml = images.map((img, index) => `
                    <div class="card">
                        <img src="${img.url}">
                        <p>${img.original_filename}</p>
                        <a class="delete-link" href="/delete?index=${index}&password=${ADMIN_PASSWORD}">❌ Delete</a>
                    </div>`).join("");

                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(renderPage("Admin Panel", `
                    <h1>🛠 Admin Panel</h1>
                    <div class="gallery">${fileListHtml}</div>
                    <a href="/">🏠 Back to Home</a>
                `));
            } else {
                res.writeHead(403, { "Content-Type": "text/html" });
                res.end(renderPage("Error", "<h1>❌ Wrong password</h1><a href='/admin'>Try again</a>"));
            }
        });
    } 
    else if (req.url.startsWith("/delete") && req.method === "GET") {
        const query = new URLSearchParams(req.url.split("?")[1]);
        const password = query.get("password");
        const index = parseInt(query.get("index"));

        if (password === ADMIN_PASSWORD && !isNaN(index) && images[index]) {
            const imgToDelete = images.splice(index, 1)[0];
            fs.writeFileSync(DATA_FILE, JSON.stringify(images, null, 2));

            // Delete from Cloudinary
            const publicId = imgToDelete.url.split("/").pop().split(".")[0];
            cloudinary.uploader.destroy(`myGallery/${publicId}`)
                .then(() => {
                    res.writeHead(302, { Location: "/admin" });
                    res.end();
                })
                .catch(err => {
                    console.error(err);
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.end("Failed to delete from Cloudinary");
                });
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("Not authorized or invalid index");
        }
    } 
    else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    }
});

server.listen(3000, "0.0.0.0", () => {
    console.log("✅ Server running at http://localhost:3000/");
});