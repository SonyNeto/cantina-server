if (process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectToDb = require('./config/connectToDb');
const routes = require('./routes/index.routes');

const app = express();

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const allowedOrigins = (process.env.CLIENT_URLS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isLocalDevelopmentOrigin(origin) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  try {
    const { hostname } = new URL(origin);

    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origem nao permitida pelo CORS'));
    },
    credentials: true,
  }),
);
app.use(cookieParser());

connectToDb();

app.use(routes);

app.listen(process.env.PORT);
