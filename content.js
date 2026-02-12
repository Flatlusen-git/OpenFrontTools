// --- KONFIGURATION ---
const SUPABASE_URL = "https://dlgvoxsedctzoxiydxto.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3ZveHNlZGN0em94aXlkeHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM4NDUsImV4cCI6MjA4NjM4OTg0NX0.0cMrv6ESkY7CTySLLVlIE2X_zVX6p3ddIxrdo6U-naQ";

// Här kollar vi om supabase redan finns, annars skapar vi den
if (typeof supabase === 'undefined' || !supabase.createClient) {
    var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// VIKTIGT: Nu använder vi 'supabaseClient' i resten av koden istället för 'supabase'
let currentRoom = "lobby";
let userName = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;

// --- LADDA SPARAT NAMN ---
chrome.storage.local.get(['savedName'], (result) => {
    if (result.savedName) userName = result.savedName;
});

// --- 1. SKAPA UI (CHATTRUTAN) ---
const chatWrapper = document.createElement('div');
chatWrapper.id = 'of-chat-wrapper'; // Se till att detta matchar din CSS

chatWrapper.innerHTML = `
    <div id="of-chat-header">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <span>ROOM: <span id="room-name">${currentRoom.toUpperCase()}</span></span>
            <span id="user-count" style="font-size: 0.8em; background: #444; padding: 2px 6px; border-radius: 10px;">Users: 1</span>
        </div>
    </div>
    <div id="of-chat-messages"></div>
    <div id="of-chat-input-area">
        <input type="text" id="of-chat-input" placeholder="Type /name to change name...">
    </div>
`;
document.body.appendChild(chatWrapper);

// Definiera header-variabeln efter att den skapats i DOM:en
const header = document.getElementById('of-chat-header');

const msgContainer = document.getElementById('of-chat-messages');
const roomDisplay = document.getElementById('room-display');
const inputField = document.getElementById('of-chat-input');

// --- LOGIK ---
function checkURL() {
    const url = window.location.href;
    let newRoom = "lobby";
    
    if (url.includes("/game/")) {
        newRoom = url.split("/game/")[1].split("/")[0];
    }

    if (newRoom !== currentRoom) {
        currentRoom = newRoom;
        roomDisplay.innerText = currentRoom.toUpperCase();
        msgContainer.innerHTML = ""; // Rensa chatten vid rumsbyte
        syncMessages();
    }
}

async function syncMessages() {
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('room_id', currentRoom)
        .order('created_at', { ascending: false })
        .limit(20);

    if (data) {
        msgContainer.innerHTML = data.reverse().map(m => `
            <div class="msg">
                <span class="author">${m.author_name}:</span>
                <span class="content">${m.content}</span>
            </div>
        `).join('');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

async function sendMessage(text) {
    if (text.startsWith("/name ")) {
        const newName = text.replace("/name ", "").trim();
        if (newName) {
            userName = newName;
            chrome.storage.local.set({savedName: userName});
            addSystemMessage(`Namn ändrat till: ${userName}`);
        }
        return;
    }

    await supabaseClient.from('messages').insert([
        { author_name: userName, content: text, room_id: currentRoom }
    ]);
}

function addSystemMessage(text) {
    msgContainer.innerHTML += `<div class="msg system">${text}</div>`;
}

// Event listeners
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && inputField.value.trim()) {
        sendMessage(inputField.value);
        inputField.value = "";
    }
});

// --- LOGIK FÖR ATT FLYTTA RUTAN ---
let isDragging = false;
let offsetX, offsetY;

const header = document.getElementById('of-chat-header');

header.addEventListener('mousedown', (e) => {
    isDragging = true;
    // Räkna ut var musen är i förhållande till rutans hörn
    offsetX = e.clientX - chatWrapper.offsetLeft;
    offsetY = e.clientY - chatWrapper.offsetTop;
    header.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        // Uppdatera positionen
        chatWrapper.style.left = (e.clientX - offsetX) + 'px';
        chatWrapper.style.top = (e.clientY - offsetY) + 'px';
        chatWrapper.style.bottom = 'auto'; // Ta bort botten-låsningen
        chatWrapper.style.right = 'auto';  // Ta bort höger-låsningen
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    header.style.cursor = 'grab';
});

async function trackPresence(room) {
    const channel = supabaseClient.channel(`room_${room}`, {
        config: { presence: { key: userName } }
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            document.getElementById('user-count').innerText = `Users: ${count}`;
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });
}

// Kör funktionen när sidan laddas
trackPresence(currentRoom);

// Loopar
setInterval(checkURL, 2000);
setInterval(syncMessages, 3000);
