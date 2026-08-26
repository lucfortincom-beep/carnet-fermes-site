// ============================================================
// CONFIGURATION DES FERMES
// Pour changer les noms/animaux, ou ajouter une 4e ferme,
// modifie seulement cette liste. Le "code" doit être exactement
// le texte encodé dans le QR code affiché à cette ferme.
// ============================================================
const FERMES = [
  {
    code: "FERME_1",
    nom: "Ferme Marineau",
    animal: "🍓",
    logo: null,
    adresse: "4356 Boul Dagenais O, Laval QC H7R 1L5",
  },
  {
    code: "FERME_2",
    nom: "Agneaux de Laval",
    animal: "🐑",
    logo: "https://static.wixstatic.com/media/b52002_a6ec16f6b60f4d98938f97a8bb2c602e~mv2.png",
    adresse: "1055 rue Principale, Sainte-Dorothée, Laval, QC H7X 1C1",
  },
  {
    code: "FERME_3",
    nom: "Ferme des Poules",
    animal: "🐔",
    logo: null,
    adresse: "Adresse à venir",
  },
];

const CLE_VILLE = "ferme_ville";
const CLE_VISITES = "ferme_visites";
const CLE_INSCRIT = "ferme_inscrit";
const CLE_ATTENTE = "ferme_file_attente";

const ecrans = {
  ville: document.getElementById("screen-ville"),
  carnet: document.getElementById("screen-carnet"),
  scanner: document.getElementById("screen-scanner"),
  inscription: document.getElementById("screen-inscription"),
  merci: document.getElementById("screen-merci"),
};

function afficherEcran(nom) {
  Object.values(ecrans).forEach(e =>
