# 🔍 SkypeLens

The best Skype JSON viewer you'll ever find. SkypeLens transforms your exported Skype data into a native-like recreation of Skype's interface – right in your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/runtime-bun-red)](https://bun.sh)
[![React](https://img.shields.io/badge/react-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5+-blue.svg)](https://www.typescriptlang.org/)

<div align="center">

### 🚀 **[Open SkypeLens →](https://thongtech.github.io/skypelens/)**

[![Launch App](https://img.shields.io/badge/🌐_Launch_App-View_Your_Conversations-blue?style=for-the-badge)](https://thongtech.github.io/skypelens/)

No installation required • Runs in your browser • Privacy-first

</div>

## ❓ Why SkypeLens?

**Skype shut down on 5th May 2025**, leaving millions of users with years of conversation history locked in difficult-to-read JSON files. Microsoft's official [Skype viewer](https://go.skype.com/skype-parser) was already severely limited before the shutdown:

- **Cannot handle large JSON conversation files** – Crashes or hangs with files over 100MB, making it useless for users with years of chat history
- **Poor, outdated UI** – Barely functional interface that's harder to navigate than the original Skype
- **Missing media support** – Images and videos don't display properly
- **No translation support** – Multilingual conversations become unreadable
- **Broken HTML rendering** – Links and formatted text display as raw HTML entities instead of proper content

**SkypeLens solves all of these problems** whilst Microsoft pushes users toward Teams without providing proper archival tools. Your Skype memories deserve better than Microsoft's abandoned parser.

## ✨ Features

- 🎨 **Skype-like Interface** – A UI recreation with dark/light themes matching the original Skype design
- 🔒 **Privacy First** – Everything processes locally in your browser; no data ever sent to servers
- 🚀 **No File Size Limits** – Handles massive `messages.json` files (500MB+) with streaming parser and virtual scrolling
- 🖼️ **Full Media Support** – Upload entire Skype export folder to view images, videos, and all media files alongside conversations
- 🔍 **Message Search** – Search within conversations with real-time filtering, match highlighting, and result navigation
- ⚡ **Performance Optimised** – Virtual scrolling, lazy loading, and memory-efficient rendering for smooth browsing

### 💬 Supported Message Types
| Type | Description |
|------|-------------|
| 💬 `RichText` | Standard text messages with HTML formatting |
| 🌐 `Translation` | Automatically shows correct language based on sender |
| 👥 `ThreadActivity` | System messages (member additions, settings changes) |
| 📞 `Event/Call` | Call logs with duration and participant information |
| ℹ️ `Notice` | System notifications and announcements |
| 🃏 `PopCard` | Card-based notifications |
| 🖼️ `UriObject` | Image messages with thumbnails |
| 📎 `Media_GenericFile` | File attachments |
| 🎥 `Media_Video` | Video messages with preview support |
| 📝 `Text` | Legacy text messages (fallback support) |
| 🔗 `InviteFreeRelationshipChanged` | Relationship change notifications |

### 🌐 Translation Handling
SkypeLens intelligently processes Skype's built-in translation feature:
- **Messages you sent** – Displays the original message in your language
- **Messages you received** – Shows the translated message in your language
- **Automatic detection** – Parses translation metadata from message content without manual configuration

### 🖼️ Media Support
- **Format Support** – Displays common image formats (JPG, PNG, GIF) and video formats (MP4, AVI)
- **Thumbnail Strip** – Browse all media in a conversation with scrollable thumbnails and position counter
- **Image Viewer** – Zoom from 0.5× to 5× with mouse wheel, pan by dragging when zoomed in
- **Keyboard Controls** – Navigate with arrow keys, zoom with `+`/`-`/`0`, download media, close with `Escape`

## 🚀 Quick Start

### Exporting Your Skype Data

1. Go to [https://go.skype.com/export](https://go.skype.com/export)
2. Request your data export
3. Download and extract the archive when ready

### Using SkypeLens

1. Open SkypeLens in your browser (default: http://localhost:5173)
2. **Choose your upload method:**
   - **Conversations only** – Drag and drop `messages.json` or click to select it
   - **Full media support** – Click "Select Export Directory" and choose the entire extracted Skype export folder
3. Browse your conversations with the familiar Skype interface!

## 📦 Installation

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+

### Setup

```
# Clone the repository
git clone https://github.com/thongtech/skypelens.git
cd skypelens

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

### Accessing the App

- **Development**: http://localhost:5173
- **Production**: Build files in `dist/` directory

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss major changes.
