console.log('Starting server...');
const http = require('http');
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  console.log('Request received');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World - Server is working!');
});

server.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
