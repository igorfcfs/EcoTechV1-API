const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const usersRoutes = require("./routes/users");
const eletronicosRoutes = require("./routes/eletronicos");
const locaisRoutes = require("./routes/locais");
const relatorioRoutes = require("./routes/relatorio");

const app = express();

app.use(cors({origin: true}));
app.use(express.json());

app.use("/users", usersRoutes);
app.use("/eletronicos", eletronicosRoutes);
app.use("/locais", locaisRoutes);
app.use("/relatorio", relatorioRoutes);

exports.api = functions.https.onRequest(app);
