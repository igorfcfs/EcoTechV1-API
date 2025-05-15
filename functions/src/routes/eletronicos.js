const express = require("express");
const {db} = require("../firebaseConfig");
const {Timestamp} = require("firebase-admin/firestore");

// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("recycled_eletronics").get();
    const eletronicos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(eletronicos);
  } catch (error) {
    console.error("Erro ao buscar eletrônicos:", error);
    res.status(500).json({erro: "Erro ao buscar eletrônicos"});
  }
});

router.get("/usuario/:uid", async (req, res) => {
  const uid = req.params.uid;

  if (!uid) {
    return res.status(400).json({ message: "UID do usuário é obrigatório." });
  }

  try {
    const snapshot = await db
      .collection("recycled_eletronics")
      .where("uid", "==", uid)
      .orderBy("criadoEm", "desc") // ordena por data, do mais novo para o mais antigo
      .get();

    const eletronicos = [];
    snapshot.forEach((doc) => {
      eletronicos.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json(eletronicos);
  } catch (error) {
    console.error("Erro ao buscar eletrônicos do usuário:", error);
    return res.status(500).json({ message: "Erro ao buscar eletrônicos." });
  }
});

router.get("/usuario-soft/:uid", async (req, res) => {
  const uid = req.params.uid;

  if (!uid) {
    return res.status(400).json({ message: "UID do usuário é obrigatório." });
  }

  try {
    const snapshot = await db
      .collection("recycled_eletronics")
      .where("uid", "==", uid)
      .where("show", "==", true) // opcional: se usar soft delete
      .orderBy("criadoEm", "desc") // ordena por data, do mais novo para o mais antigo
      .get();

    const eletronicos = [];
    snapshot.forEach((doc) => {
      eletronicos.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json(eletronicos);
  } catch (error) {
    console.error("Erro ao buscar eletrônicos do usuário:", error);
    return res.status(500).json({ message: "Erro ao buscar eletrônicos." });
  }
});


// o localDescarte so pode ter o id de um local existente
router.post("/", async (req, res) => {
  const {
    uid,
    categoria,
    quantidade,
    localDescarte,
    pontos,
  } = req.body;

  // eslint-disable-next-line max-len
  if (!uid || !categoria || !quantidade || !localDescarte || !pontos) {
    return res.status(400).json({message: "Todos os dados são obrigatórios."});
  }

  try {
    // Verifica se o local de descarte existe
    const locaisSnap = await db.collection("locations").get();
    const locaisExistentes = locaisSnap.docs.map((doc) => doc.id);

    if (!locaisExistentes.includes(localDescarte)) {
      return res.status(400).json(
          {message: "O local de descarte informado não existe"},
      );
    }

    await db.collection("recycled_eletronics").add({
      uid,
      categoria,
      quantidade,
      localDescarte,
      pontos,
      show: true,
      criadoEm: Timestamp.now(),
    });

    res.status(201).json({message: "Eletrônico adicionado com sucesso"});
  } catch (error) {
    console.error("Erro ao adicionar eletrônico:", error);
    res.status(500).json({
      erro: "Erro ao adicionar eletrônico",
      detalhes: error.message,
    });
  }
});

// aqui o uid so poderá ser alterado pra "" ou para o id de um usuário existente
router.put("/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const novosDados = req.body;

    const docRef = db.collection("recycled_eletronics").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({erro: "Eletrônico não encontrado"});
    }

    // Verifica se o uid está presente nos novos dados
    if (novosDados.uid !== undefined) {
      const novoUid = novosDados.uid;

      // Permite uid ser ""
      if (novoUid !== "") {
        // Se não for "", verifica se o uid existe na collection "users"
        const userDoc = await db.collection("users").doc(novoUid).get();
        if (!userDoc.exists) {
          // eslint-disable-next-line max-len
          return res.status(400).json({erro: "UID inválido: usuário não encontrado. Você só pode alterar o uid para '' ou pelo uid de um usuário existente."});
        }
      }
    }
    delete novosDados.localDescarte; // o localDescarte não pode ser alterado
    await docRef.update(novosDados);

    res.status(200).json({message: "Eletrônico atualizado com sucesso"});
  } catch (error) {
    console.error("Erro ao atualizar eletrônico:", error);
    res.status(500).json({
      erro: "Erro ao atualizar eletrônico",
      detalhes: error.message,
    });
  }
});

// Rota para soft delete de um eletrônico específico
router.delete("/soft-delete/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ message: "ID é obrigatório." });
  }

  try {
    const docRef = db.collection("recycled_eletronics").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: "Eletrônico não encontrado." });
    }

    await docRef.update({ show: false });

    res.status(200).json({ message: "Eletrônico deletado do histórico com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar eletrônico:", error);
    res.status(500).json({ erro: "Erro ao deletar eletrônico", detalhes: error.message });
  }
});

// Rota para soft delete de TODOS os eletrônicos de um usuário
router.delete("/soft-delete/limpar/:uid", async (req, res) => {
  const uid = req.params.uid;

  if (!uid) {
    return res.status(400).json({ message: "UID é obrigatório." });
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não existe." });
    }

    const snapshot = await db
      .collection("recycled_eletronics")
      .where("uid", "==", uid)
      .get();

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const docRef = doc.ref;
      batch.update(docRef, { show: false });
    });

    await batch.commit();

    res.status(200).json({ message: "Todos os eletrônicos do user foram ocultados com sucesso." });
  } catch (error) {
    console.error("Erro ao ocultar eletrônicos do usuário:", error);
    res.status(500).json({ error: "Erro ao ocultar eletrônicos do usuário", detalhes: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({message: "ID é obrigatório."});
  }

  try {
    const docRef = db.collection("recycled_eletronics").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({message: "Eletrônico não encontrado."});
    }

    await docRef.delete();

    res.status(200).json({message: "Eletrônico deletado com sucesso."});
  } catch (error) {
    console.error("Erro ao deletar eletrônico:", error);
    // eslint-disable-next-line max-len
    res.status(500).json({erro: "Erro ao deletar eletrônico", detalhes: error.message});
  }
});

module.exports = router;
