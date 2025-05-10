const express = require("express");
const { db } = require("../firebaseConfig");

// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Garante que o ID do documento seja incluído em cada objeto de usuário.
      return {
        uid: doc.id, // Use doc.id para obter o UID do documento.
        ...data,
      };
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ erro: "Erro ao buscar usuários" });
  }
});

// o post já criará um analytics deste user automaticamente
router.post("/", async (req, res) => {
  const { nome, sobrenome, telefone, email } = req.body;
  let { uid } = req.body; // Permite que o UID seja fornecido ou gerado.

  if (!nome || !email) {
    return res.status(400).json({ message: "Nome e email são obrigatórios." }); //alterado para nome
  }

  try {
    // Se o UID não for fornecido, gere um novo.
    if (!uid) {
      //NÃO GERAR desta forma, pois o firestore reclama de caminhos de collection com '/'
      //uid = db.collection("users").doc().id;
      const userRef = db.collection("users").doc();
      uid = userRef.id;
    }
    const criadoEm = new Date();
    // Cria o documento do usuário
    await db.collection("users").doc(uid).set({
      uid, // Garante que o UID seja armazenado no documento.
      nome,
      sobrenome,
      telefone,
      email,
      fotoPerfil: "",
      criadoEm,
    });

    // Cria o documento de analytics para o mesmo UID
    await db.collection("analytics").doc(uid).set({
      uid: uid,
      pontos: 0,
      recycled_eletronics: 0,
      last_updated: criadoEm, // Use a mesma data de criação.
    });

    res.status(201).json({ // Use 201 Created
      message: "Usuário e analytics criados com sucesso",
      uid,
    });
  } catch (error) {
    console.error("Erro ao salvar usuário e analytics:", error);
    res.status(500).json({
      message: "Erro ao salvar usuário e analytics",
      error: error.message,
    });
  }
});

// não quero poder alterar o uid aqui
router.put("/:uid", async (req, res) => {
  const uid = req.params.uid;
  const novosDados = req.body;

  if (!uid) {
    return res.status(400).json({ message: "UID é obrigatório." });
  }

  try {
    // Remove a propriedade 'uid' do objeto novosDados, se existir
    delete novosDados.uid;

    const userRef = db.collection("users").doc(uid);
    const docSnap = await userRef.get();

     if (!docSnap.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    await userRef.update(novosDados);

    res.status(200).json({ message: "Usuário atualizado com sucesso." });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    // eslint-disable-next-line max-len
    res.status(500).json({ erro: "Erro ao atualizar usuário", detalhes: error.message });
  }
});

router.delete("/:uid", async (req, res) => {
  const uid = req.params.uid;
  if (!uid) {
    return res.status(400).json({ message: "UID é obrigatório." });
  }
  try {
    const userRef = db.collection("users").doc(uid);
    const docSnap = await userRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    // Deleta o documento de analytics
    await db.collection("analytics").doc(uid).delete();

    // Atualiza os documentos de recycled_eletronics
    const recycledElectronicsQuerySnapshot = await db.collection("recycled_eletronics")
      .where("uid", "==", uid)
      .get();

    const batch = db.batch();
    recycledElectronicsQuerySnapshot.forEach((doc) => {
      const docRef = db.collection("recycled_eletronics").doc(doc.id);
      batch.update(docRef, { uid: null }); //alterado para null
    });
    await batch.commit();

    // Deleta o usuário
    await userRef.delete();

    res.status(200).json({ message: "Usuário deletado e histórico de eletrônicos atualizado com sucesso." }); //alterado mensagem
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ erro: "Erro ao deletar usuário", detalhes: error.message });
  }
});

module.exports = router;
