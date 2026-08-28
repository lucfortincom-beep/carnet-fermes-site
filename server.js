// ============================================================
// SERVEUR DE L'APPLICATION "MON CARNET DE FERMES"
// Version hébergement gratuit (Render + MongoDB Atlas).
// Les données sont enregistrées dans une base MongoDB Atlas
// (gratuite à vie) au lieu d'un fichier local, car les
// hébergements gratuits comme Render n'offrent pas de disque
// permanent.
// ============================================================

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;

// Ces deux valeurs se configurent comme "variables d'environnement"
// dans le tableau de bord Render — jamais écrites directement ici.
const MONGODB_URI = process.env.MONGODB_URI;
const MOT_DE_PASSE_ADMIN = process.env.MOT_DE_PASSE_ADMIN || "change-moi-1234";

if (!MONGODB_URI) {
  console.error("⚠️  La variable MONGODB_URI n'est pas définie. Voir le README.");
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // sert la page admin.html

let villesCollection, inscriptionsCollection, scansCollection;

async function demarrer() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("carnet_fermes");
  villesCollection = db.collection("villes");
  inscriptionsCollection = db.collection("inscriptions");
  scansCollection = db.collection("scans");

  app.listen(PORT, () => {
    console.log(`Serveur "Mon carnet de fermes" démarré sur le port ${PORT}`);
  });
}

// --- reçoit la ville, dès le début de la visite ---
app.post("/api/ville", async (req, res) => {
  const { ville } = req.body;
  if (!ville || typeof ville !== "string") {
    return res.status(400).json({ erreur: "Ville manquante" });
  }
  await villesCollection.insertOne({ ville: ville.trim(), date: new Date() });
  res.json({ ok: true });
});

// --- reçoit une inscription au tirage, une fois les 3 fermes visitées ---
app.post("/api/inscription", async (req, res) => {
  const { prenom, nom, contact, ville } = req.body;
  if (!prenom || !nom || !contact) {
    return res.status(400).json({ erreur: "Champs manquants" });
  }
  await inscriptionsCollection.insertOne({
    prenom: prenom.trim(),
    nom: nom.trim(),
    contact: contact.trim(),
    ville: (ville || "").trim(),
    date: new Date(),
  });
  res.json({ ok: true });
});

// --- enregistre un scan de QR code pour une ferme (pour les statistiques) ---
app.post("/api/scan", async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ erreur: "Code manquant" });
  }
  await scansCollection.insertOne({ code: code.trim(), date: new Date() });
  res.json({ ok: true });
});

// --- consultation des données (protégée par mot de passe) ---
app.get("/api/admin/donnees", async (req, res) => {
  if (req.query.motdepasse !== MOT_DE_PASSE_ADMIN) {
    return res.status(401).json({ erreur: "Mot de passe incorrect" });
  }
  const villes = await villesCollection.find().toArray();
  const inscriptions = await inscriptionsCollection.find().toArray();
  res.json({ villes, inscriptions });
});

// --- statistiques de scans par ferme, par semaine et pour la saison complète ---
app.get("/api/admin/statistiques", async (req, res) => {
  if (req.query.motdepasse !== MOT_DE_PASSE_ADMIN) {
    return res.status(401).json({ erreur: "Mot de passe incorrect" });
  }

  const scans = await scansCollection.find().sort({ date: 1 }).toArray();

  if (scans.length === 0) {
    return res.json({ semaines: [], totalSaison: {} });
  }

  const MS_SEMAINE = 7 * 24 * 60 * 60 * 1000;
  const premiereDate = scans[0].date.getTime();

  const semainesMap = {};
  const totalSaison = {};

  scans.forEach(s => {
    const numero = Math.floor((s.date.getTime() - premiereDate) / MS_SEMAINE) + 1;

    if (!semainesMap[numero]) {
      const debut = new Date(premiereDate + (numero - 1) * MS_SEMAINE);
      semainesMap[numero] = { numero, depuis: debut.toISOString(), parFerme: {} };
    }
    semainesMap[numero].parFerme[s.code] = (semainesMap[numero].parFerme[s.code] || 0) + 1;
    totalSaison[s.code] = (totalSaison[s.code] || 0) + 1;
  });

  const semaines = Object.values(semainesMap).sort((a, b) => a.numero - b.numero);

  res.json({ semaines, totalSaison });
});

// --- export CSV des inscriptions, prêt à ouvrir dans Excel ---
app.get("/api/admin/export-csv", async (req, res) => {
  if (req.query.motdepasse !== MOT_DE_PASSE_ADMIN) {
    return res.status(401).json({ erreur: "Mot de passe incorrect" });
  }
  const inscriptions = await inscriptionsCollection.find().toArray();
  let csv = "Prénom,Nom,Contact,Ville,Date\n";
  inscriptions.forEach(i => {
    csv += `${i.prenom},${i.nom},${i.contact},${i.ville},${i.date.toISOString()}\n`;
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=inscriptions.csv");
  res.send(csv);
});

demarrer();
