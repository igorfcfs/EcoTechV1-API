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
