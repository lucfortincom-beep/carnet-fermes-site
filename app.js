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
    nom: "Ferme des Moutons",
    animal: "🐑",
    logo: null,
    adresse: "Adresse à venir",
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
  Object.values(ecrans).forEach(e => e.classList.add("cache"));
  ecrans[nom].classList.remove("cache");
}

function getVisites() {
  return JSON.parse(localStorage.getItem(CLE_VISITES) || "[]");
}
function setVisites(liste) {
  localStorage.setItem(CLE_VISITES, JSON.stringify(liste));
}

function obtenirParamUrl(nom) {
  return new URLSearchParams(window.location.search).get(nom);
}

let fermeEnAttente = null;

function enregistrerVisite(code) {
  const ferme = FERMES.find(f => f.code === code);
  if (!ferme) return;
  const visites = getVisites();
  if (!visites.includes(ferme.code)) {
    visites.push(ferme.code);
    setVisites(visites);
    if (navigator.vibrate) navigator.vibrate(120);
  }
}

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
