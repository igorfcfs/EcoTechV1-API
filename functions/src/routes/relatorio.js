const express = require("express");
const { db } = require("../firebaseConfig");

const router = express.Router();

// Função reutilizável para cálculo por categoria
async function calcularPorCategoria(querySnapshot) {
  const categorias = {};
  let totalGeral = 0;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const categoria = data.categoria || "desconhecida";
    const quantidade = data.quantidade || 0;

    categorias[categoria] = (categorias[categoria] || 0) + quantidade;
    totalGeral += quantidade;
  });

  // Calcula porcentagem por categoria
  const categoriasComPorcentagem = {};
  for (const [cat, qtd] of Object.entries(categorias)) {
    categoriasComPorcentagem[cat] = {
      quantidade: qtd,
      porcentagem: ((qtd / totalGeral) * 100).toFixed(2) + "%"
    };
  }

  return {
    total: totalGeral,
    porCategoria: categoriasComPorcentagem
  };
}

// Rota 1 – Relatório individual do usuário
router.get("/:uid", async (req, res) => {
  const uid = req.params.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não existe." });
    }

    const snapshot = await db
      .collection("recycled_eletronics")
      .where("uid", "==", uid)
      .get();

    const { total, porCategoria } = await calcularPorCategoria(snapshot);

    let totalPontos = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalPontos += data.pontos || 0;
    });

    const analyticsData = {
      pontos: totalPontos,
      recycled_eletronics: total,
      por_categoria: porCategoria,
      last_updated: new Date(),
    };

    await db.collection("analytics").doc(uid).set(analyticsData, { merge: true });

    res.status(200).json({ uid, ...analyticsData });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Rota 2 – Relatório por local (todos os usuários)
router.get("/lixo-reciclado/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const localRef = db.collection("locations").doc(id);
    const localDoc = await localRef.get();

    if (!localDoc.exists) {
      return res.status(404).json({ erro: "Local não encontrado" });
    }

    const eletronicsSnap = await db
      .collection("recycled_eletronics")
      .where("localDescarte", "==", id)
      .get();

    const { total, porCategoria } = await calcularPorCategoria(eletronicsSnap);

    let pontos = 0;
    eletronicsSnap.forEach((doc) => {
      const data = doc.data();
      pontos += data.pontos || 0;
    });

    res.status(200).json({
      localId: id,
      recycled_eletronics: total,
      pontos,
      por_categoria: porCategoria,
    });
  } catch (error) {
    console.error("Erro ao calcular lixo reciclado:", error);
    res.status(500).json({ erro: "Erro ao calcular lixo reciclado" });
  }
});

// Rota 3 – Relatório por usuário em um local específico
router.get("/lixo-reciclado/:id_user/:id_local", async (req, res) => {
  const { id_user, id_local } = req.params;

  try {
    const localRef = db.collection("locations").doc(id_local);
    const localDoc = await localRef.get();

    if (!localDoc.exists) {
      return res.status(404).json({ erro: "Local não encontrado" });
    }

    const eletronicsSnap = await db
      .collection("recycled_eletronics")
      .where("uid", "==", id_user)
      .where("localDescarte", "==", id_local)
      .get();

    const { total, porCategoria } = await calcularPorCategoria(eletronicsSnap);

    let pontos = 0;
    eletronicsSnap.forEach((doc) => {
      const data = doc.data();
      pontos += data.pontos || 0;
    });

    res.status(200).json({
      uid: id_user,
      localId: id_local,
      recycled_eletronics: total,
      pontos,
      por_categoria: porCategoria,
    });
  } catch (error) {
    console.error("Erro ao calcular lixo reciclado:", error);
    res.status(500).json({ erro: "Erro ao calcular lixo reciclado" });
  }
});

module.exports = router;
