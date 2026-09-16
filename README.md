# Roleplay Hub — Collaborative Web Infrastructure

A responsive, mobile-first website for collaborative tabletop storytelling, persona chat, and lore wikis. Accessible from any device (iPhone, Android, PC, Mac).

---

## 🚀 How to Host for Free (Accessible from Anywhere)

### Option A: Render.com (Recommended — Full Live Sync between iPhone & Android)
Render provides free 24/7 web hosting with WebSockets, so when you and your husband message or update character bios from separate phones, they sync instantly in real time.

1. Create a free account at **[Render.com](https://render.com)** (sign in with GitHub).
2. Push or upload this folder to a repository on your **GitHub** account.
3. In Render, click **"New +"** -> **"Web Service"**.
4. Select your GitHub repository.
5. Render will automatically detect the settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click **"Create Web Service"** (select the Free tier).
7. In ~60 seconds, Render gives you a live permanent link (e.g. `https://roleplay-hub-xxxx.onrender.com`).
8. You on iPhone and your husband on Android can both open that link anywhere!

---

### Option B: GitHub Pages (Instant Free Static Hosting)
If you just want a permanent free URL hosted directly on GitHub:
1. Upload these files to a GitHub repository.
2. In your repo, click **Settings** -> **Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/ (root)`.
4. Click **Save**.
5. Your website is live at `https://<your-username>.github.io/<repo-name>/`.
