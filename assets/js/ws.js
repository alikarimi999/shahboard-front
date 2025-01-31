let socket;
let lastReceivedTime = Date.now();
let pingInterval;
let pongReceived = true;
const messageHandlers = {}; // Store handlers by message type

function connectWebSocket(url, user) {
    const userJson = JSON.stringify(user);
    const userBase64 = btoa(userJson);
    const wsUrl = `${url}?token=${encodeURIComponent(userBase64)}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("Connected to WebSocket");

        pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN && pongReceived) {
                const pingMessage = new Uint8Array([0x0]);
                socket.send(pingMessage);
                pongReceived = false;  // Expect a response (pong)
            }
        }, 1000);
    };

    socket.onmessage = (event) => {
        if (event.data instanceof Blob) {
            // Handle binary message (blob)
            const reader = new FileReader();
            reader.onload = function () {
                const arrayBuffer = reader.result;
                const byteArray = new Uint8Array(arrayBuffer);
                handleBinaryMessage(byteArray);
            };
            reader.readAsArrayBuffer(event.data);
        } else if (typeof event.data === "string") {
            let jsonData = JSON.parse(event.data);
            handleMessage(jsonData);
        } else {
            console.warn("Unknown message type:", event.data);
        }
    };

    socket.onclose = () => {
        console.log("Disconnected from WebSocket");
        clearInterval(pingInterval);
    }
    socket.onerror = (error) => console.error("WebSocket error:", error);
}

// Handle binary messages
function handleBinaryMessage(byteArray) {
    const messageType = byteArray[0];  // First byte determines message type

    if (messageType === 0x1) {
        // 0x1 means "pong" (server alive)
        lastReceivedTime = Date.now();  // Update last received time
        pongReceived = true;  // Server responded to ping
    } else {
        console.warn("Unknown binary message received:", byteArray);
    }
}

// Check if server is unresponsive (no pong in 30 seconds)
function checkServerHealth() {
    if (Date.now() - lastReceivedTime > 30000) {  // 30 seconds timeout
        alert("Your connection is unstable. Please refresh the page.");
        clearInterval(pingInterval);  // Stop sending pings and stop the WebSocket connection
        socket.close();  // Close the WebSocket connection
    }
}

// Start checking server health every 5 seconds
// setInterval(checkServerHealth, 5000);

// **Unified function to handle all messages**
function handleMessage(message) {
    const { type, data } = message;
    if (messageHandlers[type]) {
        messageHandlers[type](data);
    } else {
        console.warn("Unhandled message type:", type);
    }
}

// **Register new message handlers**
function registerMessageHandler(type, handler) {
    messageHandlers[type] = handler;
}

// **Unregister a message handler**
function unregisterMessageHandler(type) {
    delete messageHandlers[type];
}

function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error("WebSocket is not open.");
    }
}

function closeConnection() {
    if (socket) {
        socket.close();
        console.log("WebSocket connection closed.");
    }
}

// Expose functions for other files
export { connectWebSocket, sendMessage, closeConnection, registerMessageHandler, unregisterMessageHandler };
