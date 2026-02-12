// --- KONFIGURATION ---
const SUPABASE_URL = "https://dlgvoxsedctzoxiydxto.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3ZveHNlZGN0em94aXlkeHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM4NDUsImV4cCI6MjA4NjM4OTg0NX0.0cMrv6ESkY7CTySLLVlIE2X_zVX6p3ddIxrdo6U-naQ";

// Hantera krockar med globala variabelnamn
var supabaseClient;
if (typeof supabase === 'undefined' || !supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentRoom = "lobby";
let userName = "Guest" + Math.floor(Math.random() * 1000);

// --- 1. SKAPA UI (CHATTRUTAN) ---
const chatWrapper = document.createElement('div');
chatWrapper.id = 'of-chat-wrapper';
chatWrapper.innerHTML = `
    <div id="of-chat-header">
        <span>ROOM: <span id="room-name">${currentRoom}</span></span>
        <span id="user-count">Users: 1</span>
    </div>
    <div id="of-chat-messages"></div>
    <div id="of-chat-input-area">
        <input type="text" id="of-chat-input" placeholder="Type a message... (/name to change)">
    </div>
`;
document.body.appendChild(chatWrapper);

const msgContainer = document.getElementById('of-chat-messages');
const chatInput = document.getElementById('of-chat-input');
const userCountDisplay = document.getElementById('user-count');

// --- 2. LADDA SPARAT NAMN ---
chrome.storage.local.get(['savedName'], (result) => {
    if (result.savedName) {
        userName = result.savedName;
        addSystemMessage(`Welcome back, ${userName}!`);
    }
});

// --- 3. LOGIK FÖR ATT FLYTTA RUTAN ---
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

// --- 4. REALTIME: MEDDELANDEN & USER COUNT ---
const syncMessages = async () => {
    const { data } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('room', currentRoom)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (data) {
        msgContainer.innerHTML = '';
        data.reverse().forEach(m => addMessageToUI(m.user, m.text));
    }
};

// Presence: Håll koll på antal användare
const setupRealtime = () => {
    const channel = supabaseClient.channel(`room_${currentRoom}`, {
        config: { presence: { key: userName } }
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            userCountDisplay.innerText = `Users: ${count}`;
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            if (payload.new.room === currentRoom) {
                addMessageToUI(payload.new.user, payload.new.text);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });
};

// --- 5. HJÄLPFUNKTIONER ---
function addMessageToUI(user, text) {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${user}:</strong> ${text}`;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.style.color = '#888';
    div.style.fontStyle = 'italic';
    div.innerText = text;
    msgContainer.appendChild(div);
}

chatInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
        const val = chatInput.value.trim();
        
        // Kommando: /name
        if (val.startsWith('/name ')) {
            const newName = val.replace('/name ', '').substring(0, 15);
            userName = newName;
            chrome.storage.local.set({ savedName: newName });
            addSystemMessage(`Name changed to: ${newName}`);
            chatInput.value = '';
            // Starta om realtime för att uppdatera namn i listan
            setupRealtime(); 
            return;
        }

        await supabaseClient.from('messages').insert([
            { user: userName, text: val, room: currentRoom }
        ]);
        chatInput.value = '';
    }
});

// Starta allt
syncMessages();
setupRealtime();
