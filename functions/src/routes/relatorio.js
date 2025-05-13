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
      totalRecycled += data.quantidade;
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

// Exibe o lixo reciclado por TODOS OS USERS em um DETERMINADO LOCAL
router.get("/lixo-reciclado/:id", async (req, res) => {
  const {id} = req.params;

  try {
    // Verifica se o local existe
    const localRef = db.collection("locations").doc(id);
    const localDoc = await localRef.get();

    if (!localDoc.exists) {
      return res.status(404).json({erro: "Local não encontrado"});
    }

    // Busca todos os eletrônicos com localDescarte === id
    const eletronicsSnap = await db
        .collection("recycled_eletronics")
        .where("localDescarte", "==", id)
        .get();

    let recycled_eletronics = 0;
    let pontos = 0;

    eletronicsSnap.forEach((doc) => {
      const data = doc.data();
      recycled_eletronics += data.quantidade;
      pontos += data.pontos || 0;
    });

    res.status(200).json({
      localId: id,
      recycled_eletronics,
      pontos
    });
  } catch (error) {
    console.error("Erro ao calcular lixo reciclado:", error);
    res.status(500).json({erro: "Erro ao calcular lixo reciclado"});
  }
});

// Exibe o lixo reciclado por DETERMINADO USER em um DETERMINADO LOCAL
router.get("/lixo-reciclado/:id_user/:id_local", async (req, res) => {
  const {id_user, id_local} = req.params;

  try {
    // Verifica se o local existe
    const localRef = db.collection("locations").doc(id_local);
    const localDoc = await localRef.get();

    if (!localDoc.exists) {
      return res.status(404).json({erro: "Local não encontrado"});
    }

    // Busca todos os eletrônicos com localDescarte === id
    const eletronicsSnap = await db
        .collection("recycled_eletronics")
        .where("uid", "==", id_user)
        .where("localDescarte", "==", id_local)
        .get();

    let recycled_eletronics = 0;
    let pontos = 0;

    eletronicsSnap.forEach((doc) => {
      const data = doc.data();
      recycled_eletronics += data.quantidade;
      pontos += data.pontos || 0;
    });

    res.status(200).json({
      uid: id_user,
      localId: id_local,
      recycled_eletronics,
      pontos
    });
  } catch (error) {
    console.error("Erro ao calcular lixo reciclado:", error);
    res.status(500).json({erro: "Erro ao calcular lixo reciclado"});
  }
});

module.exports = router;
