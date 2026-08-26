// ============================================================
// CONFIGURATION DES FERMES
// Pour changer les noms/animaux, ou ajouter une 4e ferme,
// modifie seulement cette liste. Le "code" doit être exactement
// le texte encodé dans le QR code affiché à cette ferme.
// ============================================================
const FERMES = [
  { code: "FERME_1", nom: "Ferme des Vaches",  animal: "🐄" },
  { code: "FERME_2", nom: "Ferme des Moutons", animal: "🐑" },
  { code: "FERME_3", nom: "Ferme des Poules",  animal: "🐔" },
];

// --- clés localStorage ---
const CLE_VILLE = "ferme_ville";
const CLE_VISITES = "ferme_visites";
const CLE_INSCRIT = "ferme_inscrit";
const CLE_ATTENTE = "ferme_file_attente"; // requêtes à réessayer si le serveur est injoignable

// --- éléments ---
const ecrans = {
  ville: document.getElementById("screen-ville"),
  carnet: document.getElementById("screen-carnet"),
  scanner: document.getElementById("screen-scanner"),
  inscription: document.getElementById("screen-inscription"),
  merci: document.getElementById("screen-merci"),
};

function afficherEcran(nom) {
  Object.values(ecrans).forEach(e => e.classList.add("cache"));
  ecrans[nom].classList.remove("cache");
}

function getVisites() {
  return JSON.parse(localStorage.getItem(CLE_VISITES) || "[]");
}
function setVisites(liste) {
  localStorage.setItem(CLE_VISITES, JSON.stringify(liste));
}

// ============================================================
// ENVOI AU SERVEUR (avec file d'attente si hors-ligne)
// ============================================================
async function envoyerAuServeur(chemin, donnees) {
  try {
    const reponse = await fetch(`${API_BASE_URL}${chemin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    });
    if (!reponse.ok) throw new Error("Réponse serveur non-OK");
    return true;
  } catch (err) {
    // Le serveur est injoignable (mauvais wifi, etc.) : on garde la donnée
    // en mémoire locale et on réessaiera plus tard.
    const file = JSON.parse(localStorage.getItem(CLE_ATTENTE) || "[]");
    file.push({ chemin, donnees });
    localStorage.setItem(CLE_ATTENTE, JSON.stringify(file));
    return false;
  }
}

async function reessayerFileAttente() {
  const file = JSON.parse(localStorage.getItem(CLE_ATTENTE) || "[]");
  if (file.length === 0) return;
  const restants = [];
  for (const item of file) {
    const ok = await envoyerAuServeur(item.chemin, item.donnees).catch(() => false);
    if (!ok) restants.push(item);
  }
  localStorage.setItem(CLE_ATTENTE, JSON.stringify(restants));
}

// ============================================================
// ÉCRAN 1 : VILLE
// ============================================================
const inputVille = document.getElementById("input-ville");
const erreurVille = document.getElementById("erreur-ville");

document.getElementById("btn-commencer").addEventListener("click", () => {
  const ville = inputVille.value.trim();
  if (ville.length < 2) {
    erreurVille.textContent = "Écris le nom de ta ville pour continuer 🙂";
    return;
  }
  localStorage.setItem(CLE_VILLE, ville);
  envoyerAuServeur("/api/ville", { ville });
  afficherCarnet();
});

// ============================================================
// ÉCRAN 2 : CARNET
// ============================================================
function afficherCarnet() {
  const visites = getVisites();
  const liste = document.getElementById("liste-fermes");
  liste.innerHTML = "";

  FERMES.forEach(f => {
    const visitee = visites.includes(f.code);
    const carte = document.createElement("div");
    carte.className = "carte-ferme" + (visitee ? " visitee" : "");
    carte.innerHTML = `
      <div class="animal-ferme">${f.animal}</div>
      <div class="info-ferme">
        <div class="nom-ferme">${f.nom}</div>
        <div class="statut-ferme ${visitee ? "ok" : ""}">${visitee ? "Visitée !" : "Pas encore visitée"}</div>
      </div>
      <div class="coche">${visitee ? "✅" : "⬜"}</div>
    `;
    liste.appendChild(carte);
  });

  document.getElementById("compteur-texte").textContent =
    `${visites.length} sur ${FERMES.length} fermes visitées`;

  afficherEcran("carnet");

  if (visites.length >= FERMES.length && !localStorage.getItem(CLE_INSCRIT)) {
    setTimeout(() => afficherEcran("inscription"), 600);
  }
}

// ============================================================
// ÉCRAN 3 : SCANNER
// ============================================================
let lecteurQR = null;
const messageScanner = document.getElementById("scan-message");

document.getElementById("btn-scanner").addEventListener("click", demarrerScanner);
document.getElementById("btn-fermer-scanner").addEventListener("click", arreterScanner);

function demarrerScanner() {
  afficherEcran("scanner");
  messageScanner.textContent = "";
  lecteurQR = new Html5Qrcode("qr-reader");
  lecteurQR.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 240 },
    onScanReussi,
    () => {} // erreurs de lecture image par image : on les ignore
  ).catch(() => {
    messageScanner.textContent = "Impossible d'accéder à la caméra. Vérifie les autorisations du navigateur.";
  });
}

function arreterScanner() {
  if (lecteurQR) {
    lecteurQR.stop().then(() => lecteurQR.clear()).catch(() => {});
  }
  afficherCarnet();
}

function onScanReussi(texteDecode) {
  const code = texteDecode.trim().toUpperCase();
  const ferme = FERMES.find(f => f.code === code);

  if (!ferme) {
    messageScanner.textContent = "Ce QR code ne correspond à aucune ferme 🤔";
    return;
  }

  const visites = getVisites();
  if (visites.includes(ferme.code)) {
    messageScanner.textContent = `Tu as déjà visité ${ferme.nom} !`;
    return;
  }

  visites.push(ferme.code);
  setVisites(visites);
  messageScanner.textContent = `${ferme.animal} ${ferme.nom} ajoutée à ton carnet !`;

  if (navigator.vibrate) navigator.vibrate(120);

  setTimeout(() => {
    if (lecteurQR) lecteurQR.stop().then(() => lecteurQR.clear()).catch(() => {});
    afficherCarnet();
  }, 900);
}

// ============================================================
// ÉCRAN 4 : INSCRIPTION AU TIRAGE
// ============================================================
document.getElementById("btn-inscrire").addEventListener("click", async () => {
  const prenom = document.getElementById("input-prenom").value.trim();
  const nom = document.getElementById("input-nom").value.trim();
  const contact = document.getElementById("input-contact").value.trim();
  const erreur = document.getElementById("erreur-inscription");

  if (!prenom || !nom || !contact) {
    erreur.textContent = "Remplis tous les champs pour participer au tirage.";
    return;
  }

  const ville = localStorage.getItem(CLE_VILLE) || "";
  await envoyerAuServeur("/api/inscription", { prenom, nom, contact, ville });

  localStorage.setItem(CLE_INSCRIT, "1");
  afficherEcran("merci");
});

// ============================================================
// DÉMARRAGE DE L'APPLICATION
// ============================================================
(function demarrer() {
  reessayerFileAttente();

  const villeDejaConnue = localStorage.getItem(CLE_VILLE);
  const dejaInscrit = localStorage.getItem(CLE_INSCRIT);
  const visites = getVisites();

  if (!villeDejaConnue) {
    afficherEcran("ville");
  } else if (dejaInscrit) {
    afficherEcran("merci");
  } else if (visites.length >= FERMES.length) {
    afficherEcran("inscription");
  } else {
    afficherCarnet();
  }
})();
