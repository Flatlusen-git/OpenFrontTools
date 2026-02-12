// --- KONFIGURATION ---
const SUPABASE_URL = "https://dlgvoxsedctzoxiydxto.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3ZveHNlZGN0em94aXlkeHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM4NDUsImV4cCI6MjA4NjM4OTg0NX0.0cMrv6ESkY7CTySLLVlIE2X_zVX6p3ddIxrdo6U-naQ";

if (typeof supabase === 'undefined' || !supabase.createClient) {
    var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentRoom = "lobby";
let userName = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
let currentChannel = null;

chrome.storage.local.get(['savedName'], (result) => {
    if (result.savedName) userName = result.savedName;
});

// --- SKAPA UI ---
const chatWrapper = document.createElement('div');
// Vi använder ett ID som matchar ditt nya namn för tydlighet
chatWrapper.id = 'openfront-chat-overlay'; 
chatWrapper.innerHTML = `
    <div id="of-chat-header">
        <span>ROOM: <strong id="room-display">LOBBY</strong></span>
        <span id="user-count" style="float: right; font-weight: normal; font-size: 10px; opacity: 0.7; margin-top: 2px;">Users: 1</span>
    </div>
    <div id="of-chat-messages"></div>
    <div id="of-chat-input-area">
        <input type="text" id="of-chat-input" placeholder="Skriv ett meddelande...">
    </div>
`;
document.body.appendChild(chatWrapper);

const msgContainer = document.getElementById('of-chat-messages');
const roomDisplay = document.getElementById('room-display');
const inputField = document.getElementById('of-chat-input');
const userCountDisplay = document.getElementById('user-count');

// --- RÄKNARE (PRESENCE) ---
async function trackPresence(room) {
    if (currentChannel) currentChannel.unsubscribe();
    currentChannel = supabaseClient.channel(`presence_${room}`, {
        config: { presence: { key: userName } }
    });
    currentChannel
        .on('presence', { event: 'sync' }, () => {
            const state = currentChannel.presenceState();
            userCountDisplay.innerText = `Users: ${Object.keys(state).length}`;
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') await currentChannel.track({ online_at: new Date().toISOString() });
        });
}

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
        msgContainer.innerHTML = ""; 
        syncMessages();
        trackPresence(currentRoom);
    }
}

async function syncMessages() {
    const { data } = await supabaseClient
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
            trackPresence(currentRoom);
        }
        return;
    }
    await supabaseClient.from('messages').insert([
        { author_name: userName, content: text, room_id: currentRoom }
    ]);
}

function addSystemMessage(text) {
    msgContainer.innerHTML += `<div class="msg system" style="font-style: italic; opacity: 0.6; font-size: 0.9em;">${text}</div>`;
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && inputField.value.trim()) {
        sendMessage(inputField.value);
        inputField.value = "";
    }
});

// --- FLYTTA RUTAN ---
let isDragging = false;
let offsetX, offsetY;
const header = document.getElementById('of-chat-header');
header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - chatWrapper.offsetLeft;
    offsetY = e.clientY - chatWrapper.offsetTop;
    header.style.cursor = 'grabbing';
});
document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        chatWrapper.style.left = (e.clientX - offsetX) + 'px';
        chatWrapper.style.top = (e.clientY - offsetY) + 'px';
        chatWrapper.style.bottom = 'auto';
        chatWrapper.style.right = 'auto';
    }
});
document.addEventListener('mouseup', () => {
    isDragging = false;
    header.style.cursor = 'grab';
});

// Start
trackPresence(currentRoom);
setInterval(checkURL, 2000);
setInterval(syncMessages, 1500);

