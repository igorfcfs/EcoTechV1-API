const express = require("express");
const {db} = require("../firebaseConfig");

const router = express.Router();

router.get("/:uid", async (req, res) => {
  const uid = req.params.uid;

  try {
    // Verifica se o usuário existe na collection "users"
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({message: "Usuário não existe."});
    }
    const snapshot = await db.collection("recycled_eletronics")
        .where("uid", "==", uid)
        .get();

    let totalPontos = 0;
    let totalRecycled = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalRecycled += 1;
      totalPontos += data.pontos || 0;
    });

    const analyticsData = {
      pontos: totalPontos,
      recycled_eletronics: totalRecycled,
      last_updated: new Date(),
    };

    await db.collection("analytics").doc(uid).set(analyticsData, {merge: true});

    res.status(200).json({uid, ...analyticsData});
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({error: "Erro ao gerar relatório"});
  }
});

module.exports = router;
