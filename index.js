const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "spicycarvings.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server Running at http://localhost:${port}/`);
    });
  } catch (e) {
    console.log(`DB error message: ${e.message}`);
    process.exit(1);
  }
};

//initializing Database and Server function call
initializeDBAndServer();

//register user api
app.post("/register", async (req, res) => {
  const { username, firstname, lastname, email, password, gender } = req.body;
  const selectUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createUserQuery = `insert into 
    user(username, firstname, lastname, password, email, gender)
    values ('${username}','${firstname}','${lastname}','${hashedPassword}','${email}','${gender}')`;
    const dbResponse = await db.run(createUserQuery);
    res.send(`last created id: ${dbResponse.lastID}`);
  } else {
    res.status(400);
    res.send("user already exits! Try with new one...");
  }
});

//login user api
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const selectUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser !== undefined) {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "spicycarvings_guna_key");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  } else {
    res.status(400);
    res.send("Invalid username");
  }
});

// authentication middleware function
const authenticationToken = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, "spicycarvings_guna_key", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        req.username = payload.username;
        next();
      }
    });
  } else {
    res.status(401);
    res.send("Invalid JWT Token");
  }
};

//home page api
app.get("/", authenticationToken, async (req, res) => {
  const { username } = req;
  const selectUserQuery = `select username, gender from user where username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  res.send(dbUser);
});

app.get("/profile", authenticationToken, async (req, res) => {
  const { username } = req;
  const selectUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  res.send(dbUser);
});
