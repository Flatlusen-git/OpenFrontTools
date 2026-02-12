# OpenFront Chat Overlay

A lightweight, real-time chat overlay for players on [openfront.io](https://openfront.io). This extension allows you to communicate with other players in the same lobby or game room seamlessly.

## Features
- **Global & Room Chat:** Automatically switches channels based on your current game room.
- **Persistent Username:** Set your name once with `/name YourName` and it stays saved.
- **Draggable UI:** Click and hold the header to move the chat anywhere on your screen.

## Installation (Manual Load)
Since this extension is in development, you can install it manually in any Chromium-based browser (Chrome, Edge, Brave, Opera):

1. **Download the code:** Click the green **Code** button at the top of this page and select **Download ZIP**.
2. **Extract the files:** Unzip the downloaded file to a folder on your computer.
3. **Open Extensions Page:** - In Chrome: Go to `chrome://extensions/`
   - In Edge: Go to `edge://extensions/`
4. **Enable Developer Mode:** Toggle the **Developer mode** switch (usually in the top right or bottom left corner).
5. **Load the Extension:**
   - Click **Load unpacked**.
   - Select the folder where you extracted the files (the folder containing `manifest.json`).
6. **Start Chatting:** Refresh [openfront.io](https://openfront.io) and the chat box should appear!

## Chat Commands
- `/name <YourName>` - Changes your display name and saves it locally.


<img width="2540" height="1376" alt="ReadMeScreenshot" src="https://github.com/user-attachments/assets/d84af483-3ae1-4884-9d52-70975768fc76" />


## FAQ


**Q: Why isn't it on the Chrome Web Store?** A: To keep this project free and community-driven, I’ve chosen to host it on GitHub. This avoids registration fees and allows for faster updates.

**Q: How do I change my name?** A: Simply type `/name YourNewName` in the chat box and press Enter. Your name will be saved locally in your browser.

**Q: Does the chat see my game data?** A: No. The extension only reads the URL of the page to determine which chat room you should be in. It doesn't access your game account or private info.

**Q: I found a bug! What should I do?** A: Please open an "Issue" here on GitHub or reach out to me on Reddit. Feedback is much appreciated!
