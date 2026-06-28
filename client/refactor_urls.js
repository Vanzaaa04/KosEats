const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace exact const declarations
  content = content.replace(/const API_URL = "http:\/\/localhost:5000\/api";/g, 'const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";');
  content = content.replace(/const SOCKET_URL = "http:\/\/localhost:5000";/g, 'const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";');

  // Replace inline fetch URLs like fetch("http://localhost:5000/api/auth/register", ...)
  // We use regex to find `"http://localhost:5000/api` and replace with `${API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}`
  // Since we don't always have API_URL defined in scope for every fetch if it wasn't defined at top, it's safer to use process.env directly.
  
  // Replace: fetch("http://localhost:5000/api/...") with fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/...`)
  content = content.replace(/"http:\/\/localhost:5000\/api([^"]*)"/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}$1`');
  
  // Same for single quotes
  content = content.replace(/'http:\/\/localhost:5000\/api([^']*)'/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}$1`');

  // Replace image srcs like: `http://localhost:5000${photoUrl}` -> `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}${photoUrl}`
  content = content.replace(/http:\/\/localhost:5000\$\{/g, '${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}${');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'app'));
console.log('Refactor complete.');
