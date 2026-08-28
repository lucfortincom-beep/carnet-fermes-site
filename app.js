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
    nom: "Château Taillefer Lafon",
    animal: "🍇",
    logo: "https://www.chateautailleferlafon.ca/wp-content/uploads/brizy/230/assets/images/iW=225&iH=205&oX=0&oY=8&cW=225&cH=189/logo3.png",
    adresse: "1500 Montée Champagne, Laval, QC H7X 4H9",
  },
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
// ARRIVÉE DIRECTE VIA UN QR CODE (le QR code contient l'adresse
// du site + ?ferme=FERME_X, donc le téléphone ouvre le site ET
// enregistre la visite en un seul scan, sans passer par le
// scanner intégré à l'application).
// ============================================================
function obtenirParamUrl(nom) {
  return new URLSearchParams(window.location.search).get(nom);
}

let fermeEnAttente = null; // ferme scannée avant même que la ville soit connue

function enregistrerVisite(code) {
  const ferme = FERMES.find(f => f.code === code);
  if (!ferme) return;
  const visites = getVisites();
  if (!visites.includes(ferme.code)) {
    visites.push(ferme.code);
    setVisites(visites);
    envoyerAuServeur("/api/visite-ferme", { code: ferme.code });
    if (navigator.vibrate) navigator.vibrate(120);
  }
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

  if (fermeEnAttente) {
    enregistrerVisite(fermeEnAttente);
    fermeEnAttente = null;
  }

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

    const icone = f.logo
      ? `<img src="${f.logo}" alt="${f.nom}" class="logo-ferme">`
      : f.animal;

    const lienMaps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.adresse)}`;

    carte.innerHTML = `
      <div class="animal-ferme">${icone}</div>
      <div class="info-ferme">
        <div class="nom-ferme">${f.nom}</div>
        <div class="statut-ferme ${visitee ? "ok" : ""}">${visitee ? "Visitée !" : "Pas encore visitée"}</div>
        <a class="lien-itineraire" href="${lienMaps}" target="_blank" rel="noopener">📍 Itinéraire</a>
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
  const texte = texteDecode.trim();
  // Le QR code peut contenir soit une adresse web (ex. ...?ferme=FERME_1),
  // soit juste le code brut (ex. FERME_1) — on gère les deux formats.
  let code;
  if (texte.includes("ferme=")) {
    code = new URL(texte).searchParams.get("ferme");
  } else {
    code = texte;
  }
  code = (code || "").toUpperCase();

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
  envoyerAuServeur("/api/visite-ferme", { code: ferme.code });
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
  if (obtenirParamUrl("reset")) {
    localStorage.removeItem(CLE_VILLE);
    localStorage.removeItem(CLE_VISITES);
    localStorage.removeItem(CLE_INSCRIT);
    localStorage.removeItem(CLE_ATTENTE);
    window.history.replaceState({}, "", window.location.pathname);
  }

  reessayerFileAttente();

  const fermeUrl = obtenirParamUrl("ferme");
  if (fermeUrl) {
    // On nettoie l'adresse tout de suite pour qu'un rechargement de page
    // n'enregistre pas la visite une deuxième fois.
    window.history.replaceState({}, "", window.location.pathname);
  }

  const villeDejaConnue = localStorage.getItem(CLE_VILLE);
  const dejaInscrit = localStorage.getItem(CLE_INSCRIT);

  if (!villeDejaConnue) {
    fermeEnAttente = fermeUrl;
    afficherEcran("ville");
    return;
  }

  if (fermeUrl) enregistrerVisite(fermeUrl);

  if (dejaInscrit) {
    afficherEcran("merci");
    return;
  }

  afficherCarnet();
})();
