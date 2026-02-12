const SUPABASE_URL = "https://dlgvoxsedctzoxiydxto.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3ZveHNlZGN0em94aXlkeHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM4NDUsImV4cCI6MjA4NjM4OTg0NX0.0cMrv6ESkY7CTySLLVlIE2X_zVX6p3ddIxrdo6U-naQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRoom = "lobby";
let userName = "Guest";
let chatChannel = null;

// 1. Hämta sparat namn (från din anteckning 2026-02-11)
chrome.storage.local.get(['savedName'], (res) => {
    if (res.savedName) userName = res.savedName;
});

// 2. Skapa Chat UI
const chatWrapper = document.createElement('div');
chatWrapper.style = "position:fixed; bottom:20px; right:20px; width:300px; z-index:9999; color:white; font-family:sans-serif;";
chatWrapper.innerHTML = `
    <div style="background:rgba(0,0,0,0.9); border:1px solid #444; border-radius:5px; overflow:hidden;">
        <div style="background:#222; padding:8px; border-bottom:1px solid #444; display:flex; justify-content:space-between;">
            <span id="room-id">Lobby</span>
            <span id="user-count">Users: 0</span>
        </div>
        <div id="msg-box" style="height:250px; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:5px;"></div>
        <input type="text" id="chat-input" placeholder="Skriv meddelande..." style="width:100%; padding:10px; background:#111; border:none; color:white; border-top:1px solid #444;">
    </div>
`;
document.body.appendChild(chatWrapper);

const msgBox = document.getElementById('msg-box');
const input = document.getElementById('chat-input');
const userCountLabel = document.getElementById('user-count');

// 3. Funktion för att rendera meddelanden
function renderMessage(payload) {
    const div = document.createElement('div');
    div.innerHTML = `<span style="color:#aaa; font-size:10px;">[${new Date().toLocaleTimeString()}]</span> <b style="color:#00d4ff">${payload.author_name}:</b> ${payload.content}`;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
}

// 4. Koppla upp mot Realtime
async function setupChat(room) {
    console.log("Ansluter till rum:", room);
    currentRoom = room;
    document.getElementById('room-id').innerText = room.toUpperCase();

    if (chatChannel) supabaseClient.removeChannel(chatChannel);

    // Hämta historik först
    const { data } = await supabaseClient.from('messages').select('*').eq('room_id', room).order('created_at', { ascending: false }).limit(20);
    msgBox.innerHTML = "";
    if (data) data.reverse().forEach(renderMessage);

    // Skapa kanalen
    chatChannel = supabaseClient.channel(`room_${room}`);

    chatChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, payload => {
            renderMessage(payload.new);
        })
        .on('presence', { event: 'sync' }, () => {
            const count = Object.keys(chatChannel.presenceState()).length;
            userCountLabel.innerText = `Users: ${count}`;
        })
        .subscribe(async (status) => {
            console.log("Realtime status:", status);
            if (status === 'SUBSCRIBED') {
                await chatChannel.track({ user: userName, online_at: new Date().toISOString() });
            }
        });
}

// 5. Skicka meddelande
input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && input.value.trim() !== "") {
        const text = input.value;
        
        if (text.startsWith("/name ")) {
            userName = text.split(" ")[1];
            chrome.storage.local.set({savedName: userName});
            setupChat(currentRoom); // Starta om för att uppdatera namnet i Presence
        } else {
            // Skicka till Supabase
            await supabaseClient.from('messages').insert([
                { author_name: userName, content: text, room_id: currentRoom }
            ]);
        }
        input.value = "";
    }
});

// 6. Kolla URL för rum (Lobby eller Game)
setInterval(() => {
    const url = window.location.href;
    let roomFromUrl = "lobby";
    const match = url.match(/\/game\/([a-zA-Z0-9]+)/);
    if (match) roomFromUrl = match[1];

    if (roomFromUrl !== currentRoom) {
        setupChat(roomFromUrl);
    }
}, 3000);

setupChat("lobby");
