# Roleplay Hub Website

A responsive, mobile-first collaborative roleplay platform crafted for seamless storytelling across PC, Android, and iPhone (optimized for Chrome on both mobile and desktop). Features real-time multi-device WebSockets, persistent server storage, world management with permission gating, character persona switching, cross-world direct messaging with delivered/read receipts, wiki lore documentation with image cropping, and an exclusive Superadmin testing suite.

---

## 📱 Mobile App (PWA) Installation

You and other players can add the website directly to your phone's home screen for a full-screen, native app experience without browser URL bars:
- **iPhone (Chrome / Safari)**: Tap the **Share** icon -> select **"Add to Home Screen"** -> tap **"Add"**.
- **Android (Chrome)**: Tap the **three dots (⋮)** menu in the top right -> tap **"Install App"** or **"Add to Home screen"**.

---

## 🌟 Key Features & Capabilities

### 1. Account Schema & Security
- **Username / @handle Login**: Clean login with your permanent `@handle` and password.
- **Account Registration**: Choose your display name, a permanent unique `@handle`, password, and optional hardware passkey.
- **Biometric Passkeys**: Register your device with Apple Face ID / Touch ID or Android Fingerprint for 1-tap sign-in.
- **Password Management**: Change password in Settings after entering a new password twice.
- **Danger Zone**: Multi-step account deletion with safety confirmation and prompt to transfer worlds first.

### 2. Worlds & Permissions
- **World Creation**: Founders give worlds a title, quote/one-liner hook, and short description.
- **Starter Channels**: Every new world automatically seeds with three core channels:
  1. `#main-roleplay` (Primary in-character storytelling)
  2. `#related-images` (Visual references, character art, and maps)
  3. `#ooc-lounge` (Out-of-character player discussion & plotting)
- **3-Tier Permissions**:
  - **Creator**: World founder with full administrative control, channel creation, transfer ownership, and deletion.
  - **World Editor**: Permission granted by Creator to create chat channels/categories and edit wiki articles.
  - **Viewer**: Default permission; can view wiki lore, participate in world chats, and assign their characters to the world.
- **Multi-Step World Deletion**: Safeguard against accidental deletion by requiring confirmation of world name before deleting.
- **World Switcher Visibility**: Available at the top of **Chat** and **Wiki** menus only; hidden in DMs, Cast, and Settings.

### 3. Chat System & Rich Embeds
- **Snappy Persona Switcher**: Snappy dropdown menu right above the chat bar to switch speaking identities instantly:
  - Player OOC (`(( [DisplayName] (@handle) ))`)
  - The Storyteller (`DM`)
  - Characters & NPCs from your Cast
  - `+ Spawn Temporary Character`: Quickly name and generate a temporary NPC persona, with a 1-tap discard button when the scene concludes.
- **Chat Bar**: `[+] [Text field...] [Send]` bar with direct photo attachment support from PC, Mac, iPhone, or Android.
- **Embed Engine**: Strips raw URLs that produce preview cards; renders GIFs (Tenor/Giphy), TikToks, and **YouTube Facade Cards** (clickable video thumbnail with play button opening directly in YouTube).
- **Mobile Dropdown Channel Browser**: Snappy dropdown channel selector optimized for mobile touchscreens.

### 4. Cross-World Direct Messages (DMs)
- **Always Accessible & Cross-World**: Chat with players across any world using their `@handle`.
- **Responsive Layout**:
  - **PC**: Left sidebar with `+ New Direct Message` and conversation history; chat pane on the right.
  - **Mobile**: Full-screen conversation list; tapping a user overlays the chat with a prominent `[← DMs]` back button.
- **Delivered & Read Receipts**: RSS-style message status labels showing `Delivered` and `Read` receipts.
- **Invite to World Button**: Founders can dispatch direct invitations to their worlds with an interactive card.
- **Permanent Chat Deletion**: Clear conversation history permanently with confirmation.
- **Dynamic Header Bell**: Live notification bell with a red badge indicating unread DMs.

### 5. Cast Management & Profile Editor
- **Personal Cross-World Cast**: View all characters and NPCs you created across any realm.
- **Mobile Dropdown Filters**: Filter by World and Character Type (PC vs. NPC) via clean dropdown selectors.
- **Avatar Cropper**: Built-in square/circle image cropper with zoom, rotation, and pan controls.
- **Full Character Sheet**: Fields for Name, Assigned World, PC/NPC toggle, Archetype/Class, One-Liner, Appearance, Personality, Background, Abilities, Equipment, and Lore Hooks.
- **Preview Profile**: Switch between live form editing and the finished profile view that other players see in the Wiki.

### 6. Wiki Lore Engine
- **7 Organized Categories**: `All`, `Characters`, `NPCs`, `Locations`, `Factions`, `Lore`, `Items`.
- **Permission-Gated Editing**: Viewers browse read-only article sheets; Creators and World Editors get the full Wikipedia-style markdown editor.
- **Character & NPC Attribution**: Cast members in the Wiki display their creator's `@handle`; only the creator can edit their sheet.
- **Media Uploads**: Attach square icons and photos with the built-in image cropper.

---

## 🛠️ Superadmin Dev Testing Suite
When logged in as the site administrator, tap the **"Dev Tools"** button in the top header to:
- **Simulate Incoming DM**: Simulates sending a message to test delivered/read status and sound alerts.
- **Simulate World Chat Dialogue**: Simulates in-character dialogue in the active channel.
- **Test 0-Worlds State**: Reset worlds to 0 to verify the onboarding empty state.
- **Seed Demo World**: One-click restore for the pre-built *Aethelgard: Astral Frontier* fantasy realm.
