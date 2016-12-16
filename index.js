// Main starting point of the application
require('./config/config');

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const app = express();
const authRouter = require('./routers/authRouter');
const todoRouter = require('./routers/todoRouter');
const { mongoose } = require('./db/mongoose');
const cors = require('cors');

// CORS configuration to allow only specific domains
const whitelist = ['http://localhost:8080'];
const corsOptions = {
  origin: function(origin, callback) {
    let originIsWhitelisted = whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV === "test";
    callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
  }
}

// App Setup
// app.use(morgan('combined')); // Log framework
app.use(cors(corsOptions));
app.use(bodyParser.json({ type: '*/*' })); // Currently parses all requests as if it were json
authRouter(app);
todoRouter(app);

// Server Setup
const PORT = process.env.PORT || 3090;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = {
  server
};
