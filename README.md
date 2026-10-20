# 🎾 Antigravity Tennis Masters

Un jeu de tennis rétro-arcade moderne et réactif développé en **HTML5 Canvas** et **JavaScript vanilla**, avec moteur physique de balle en 3D (altitude, rebonds, spin), synthèse sonore procédurale (Web Audio API) et règles officielles de décompte du tennis.

---

## 🌟 Fonctionnalités

- 🎾 **Moteur physique 3D réaliste** :
  - Simulation de la hauteur et de l'ombre de la balle
  - Dégagement du filet avec détection des fautes
  - Effets de frappe : **Frappe à plat**, **Lift / Topspin** (accélération et trajectoire plongeante), et **Amortie / Slice**
- 🤖 **Mode Solo vs IA intelligent** :
  - 3 niveaux de difficulté : **Débutant**, **Club**, et **Pro**
  - Anticipation humaine et gestion des trajectoires
- 👥 **Mode 2 Joueurs en local** :
  - Affrontez un ami sur le même clavier
- 🏟️ **3 Surfaces de Court authentiques** :
  - **Terre Battue (Roland-Garros)** : Vitesse modérée, rebond haut et glissades
  - **Gazon (Wimbledon)** : Échanges ultra rapides et rebonds bas
  - **Dur (US Open)** : Équilibre parfait et rebond franc
- 🔊 **Moteur Audio Procédural (Web Audio API)** :
  - Zéro fichier audio externe lourd à télécharger !
  - Bruits d'impact de raquette, rebonds sur le court, son du filet et fanfares de victoire synthétisés en temps réel
- 🏆 **Règles officielles du tennis** :
  - Points : `0`, `15`, `30`, `40`, `Égalité (40-40)`, `Avantage`
  - Décompte des Jeux et des Sets
  - Alternance des côtés de service (Deuce / Avantage)

---

## 🎮 Commandes de Jeu

### 👤 Joueur 1 (Bas du court)
| Action | Touche |
| :--- | :--- |
| **Déplacement** | <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> (Flèches) |
| **Service / Frappe à plat** | <kbd>Espace</kbd> |
| **Topspin / Frappe puissante** | <kbd>W</kbd> ou <kbd>Z</kbd> |
| **Amortie / Slice** | <kbd>X</kbd> |

### 👤 Joueur 2 (Mode 2 Joueurs - Haut du court)
| Action | Touche |
| :--- | :--- |
| **Déplacement** | <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd> (ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>) |
| **Service / Frappe à plat** | <kbd>F</kbd> |
| **Topspin / Puissance** | <kbd>G</kbd> |

### ⚙️ Commandes Générales
- <kbd>P</kbd> ou <kbd>Échap</kbd> : Mettre en pause / Reprendre
- Bouton **🔊 Son** : Activer / Couper les effets sonores

---

## 🚀 Lancer le jeu en local

Aucune installation ni dépendance requise :
1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/enzopimienta/tennis-game.git
   cd tennis-game
   ```
2. Ouvrez simplement `index.html` dans n'importe quel navigateur moderne (Chrome, Edge, Firefox, Safari).

---

## 🌐 Déploiement sur GitHub Pages

Pour jouer en ligne gratuitement :
1. Rendez-vous sur votre dépôt GitHub : `https://github.com/enzopimienta/tennis-game`
2. Allez dans **Settings** > **Pages**.
3. Dans **Build and deployment** > **Branch**, sélectionnez la branche `main` et le dossier `/ (root)`.
4. Cliquez sur **Save**. Votre jeu sera accessible en ligne en quelques secondes !

---

*Développé pour @enzopimienta avec Antigravity.*
