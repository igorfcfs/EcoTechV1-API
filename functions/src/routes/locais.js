const express = require("express");
const {db} = require("../firebaseConfig");
const { getDistance } = require('geolib');

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("locations").get();
    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(locations);
  } catch (error) {
    console.error("Erro ao buscar locais:", error);
    res.status(500).json({erro: "Erro ao buscar locais"});
  }
});

router.get("/local_mais_proximo", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ erro: "Latitude e longitude são obrigatórias." });
  }

  const userCoords = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
  };

  try {
    const snapshot = await db.collection("locations").get();
    const locais = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const latitude = data.coordenadas?._latitude;
      const longitude = data.coordenadas?._longitude;

      if (latitude && longitude) {
        const distancia = getDistance(userCoords, {
          latitude,
          longitude,
        });

        locais.push({
          id: doc.id,
          nome: data.nome || "Sem nome",
          distancia,
        });
      }
    });

    if (locais.length === 0) {
      return res.status(404).json({ erro: "Nenhum local de descarte encontrado." });
    }

    locais.sort((a, b) => a.distancia - b.distancia);
    const maisProximo = locais[0];

    res.status(200).json({
      id_local: maisProximo.id,
      nome_local: maisProximo.nome,
      distancia: maisProximo.distancia, // em metros
    });
  } catch (error) {
    console.error("Erro ao buscar local mais próximo:", error);
    res.status(500).json({ erro: "Erro interno ao buscar local mais próximo." });
  }
});

router.post("/", async (req, res) => {
  const {id, nome, site, coordenadas, endereco, imagem} = req.body;

  if (!id || !nome || !site || !coordenadas || !endereco || !imagem) {
    return res.status(400).json({message: "Todos os dados são obrigatórios."});
  }

  try {
    // Apenas salva os dados no Firestore
    await db.collection("locations").doc(id).set({
      nome,
      site,
      coordenadas,
      endereco,
      imagem,
      qtdLixeiras: 1,
      datas: {
        inauguracao: new Date(),
        ultimaInstalacao: new Date(),
      },
    });

    res.status(200).json({
      message: "Local salvo com sucesso",
      id,
    });
  } catch (error) {
    console.error("Erro ao salvar local no Firestore:", error);
    res.status(500).json({
      message: "Erro ao salvar local",
      error: error.message,
    });
  }
});

router.post("/instalar-nova-lixeira/:id", async (req, res) => {
  const {id} = req.params;

  try {
    const locationRef = db.collection("locations").doc(id);
    const docSnap = await locationRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({message: "Local não encontrado."});
    }

    const data = docSnap.data();
    const qtdLixeirasAtual = data.qtdLixeiras || 0;

    await locationRef.set({
      qtdLixeiras: qtdLixeirasAtual + 1,
      datas: {
        ultimaInstalacao: new Date(),
      },
    }, {merge: true});

    res.status(200).json({
      message: "Lixeira instalada com sucesso",
      novaQtd: qtdLixeirasAtual + 1,
    });
  } catch (error) {
    console.error("Erro ao instalar nova lixeira no Firestore:", error);
    res.status(500).json({
      message: "Erro ao instalar nova lixeira",
      error: error.message,
    });
  }
});

// PRECISO PROIBIR A ALTERACAO DE ID, DATAS E QTDLIXEIRAS
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const novosDados = req.body;

  if (!id) {
    return res.status(400).json({message: "ID é obrigatório."});
  }

  try {
    const locationRef = db.collection("locations").doc(id);

    delete novosDados.id;
    delete novosDados.datas;
    delete novosDados.qtdLixeiras;
    await locationRef.update(novosDados);

    res.status(200).json({message: "Local atualizado com sucesso."});
  } catch (error) {
    console.error("Erro ao atualizar local:", error);
    // eslint-disable-next-line max-len
    res.status(500).json({erro: "Erro ao atualizar local", detalhes: error.message});
  }
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({message: "ID é obrigatório."});
  }

  try {
    const localRef = db.collection("locations").doc(id);
    const docSnap = await localRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({message: "Local não encontrado."});
    }

    await localRef.delete();

    res.status(200).json({message: "Local deletado com sucesso."});
  } catch (error) {
    console.error("Erro ao deletar local:", error);
    // eslint-disable-next-line max-len
    res.status(500).json({erro: "Erro ao deletar local", detalhes: error.message});
  }
});

module.exports = router;
