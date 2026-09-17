# Roleplay Hub — Collaborative Roleplay Website

A responsive, modern website for collaborative tabletop roleplay, character storytelling, and shared world lore. 

Designed to be used directly in any standard web browser (**Google Chrome on Android, PCs, and iPhones/Macs**). **No app store downloads, no installations, no PWAs** — simply open the website link in your browser and start roleplaying!

---

## ✨ Features

- **Pure Browser View:** Works cleanly in Chrome, Safari, Edge, or Firefox across Android, iPhone, Windows, and macOS.
- **Dedicated Direct Messages:** Real-time private chat between Kitty (`@EarlGreyFae`) and James (`@GrimGerbil`), complete with interactive world invites and photo sharing.
- **Shared Worlds & Channels:**
  - **Wonderworld** — Created by James (`@GrimGerbil`) with `#main-roleplay`, `#related-images`, and `#ooc-lounge`.
  - **Aethelgard: Astral Frontier** — Created by Kitty (`@EarlGreyFae`) with `#tavern-haven` and `#shattered-gate`.
  - **Neo-Veridia: Neon Shadows** — Created by Kitty (`@EarlGreyFae`) with `#sector-4-alley` and `#the-grid`.
- **Lore Wiki & Cast:** Create and browse characters, locations, factions, and artifacts.
- **Real-Time Cross-Device Sync:** Automatic cloud and WebSocket relay synchronizes DMs and worlds instantly between separate phones and computers.

---

## 🚀 How to Host & View the Website

### Option 1: Render.com (Recommended Free Cloud Website)
1. Push this repository to **GitHub**.
2. Go to **[Render.com](https://render.com)** -> Click **"New +"** -> **"Web Service"**.
3. Select your GitHub repository.
4. Render automatically detects Node:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **"Create Web Service"** (Free plan).
6. Render gives you a permanent website link (e.g., `https://roleplay-hub-xxxx.onrender.com`).
7. Open that link in Google Chrome on your phone, laptop, or desktop!

### Option 2: Run Locally on Your PC or Mac
1. Open a terminal in this folder.
2. Run:
   ```bash
   node server.js
   ```
3. Open `http://localhost:10000` in Google Chrome!

---

## 🛡️ Player Accounts

- **Kitty (`@EarlGreyFae`):** Sole Superadmin with world ownership and administrative controls.
- **James (`@GrimGerbil`):** Player and Creator of **Wonderworld**.
