(() => {
    const messagesEl = document.getElementById("messages");
    const authorEl = document.getElementById("author");
    const messageEl = document.getElementById("message");
    let sendBtn = document.getElementById("send");
    const feedbackEl = document.getElementById("feedback");
    const statusPill = document.getElementById("status-pill");

    const socket = io();

    socket.on("chat:deleted", (id) => {
        const msgEl = messagesEl.querySelector(`article[data-id='${id}']`);
        if (msgEl) msgEl.remove();
    });

    socket.on("chat:init", (messages) => renderMessages(messages));
    socket.on("chat:new", (message) => appendMessage(message));
    socket.on("chat:error", (msg) => showFeedback(msg, true));

    socket.on("chat:edited", (updatedMessage) => {
        const msgEl = messagesEl.querySelector(`article[data-id='${updatedMessage.id}']`);
        if (!msgEl) return;

        const textEl = msgEl.querySelector(".message_text");
        textEl.textContent = updatedMessage.text;

        let editedEl = msgEl.querySelector(".message_edited");
        if (!editedEl) {
            editedEl = document.createElement("span");
            editedEl.className = "message_edited";
            editedEl.textContent = " (edited)";
            msgEl.appendChild(editedEl);
        }
    });

    const savedName = localStorage.getItem("mkchat:name");
    if(savedName && authorEl instanceof HTMLInputElement) {
        authorEl.value = savedName;
    }

    const setStatus = (text, online) => {
        statusPill.textContent = text;
        statusPill.classList.toggle("status-pill--online", online);
        statusPill.classList.toggle("status-pill--offline", !online);
    };

    const formatTime = (timestamp) => {
        try {
            return new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(timestamp));
        } catch {
            return "";
        }
    };

    const createMessageElement = (message) => {
        const container = document.createElement("article");
        container.className = "message";
        container.dataset.id = message.id;

        const meta = document.createElement("div");
        meta.className = "message_meta";

        const author = document.createElement("span");
        author.className = "message_author";
        author.textContent = message.author;

        const time = document.createElement("time");
        time.className = "message_time";
        time.textContent = formatTime(message.timestamp);

        meta.append(author, document.createTextNode(" "), time);

        if (message.replyTo) {
            const reply = document.createElement("div");
            reply.className = "message_reply";
            reply.textContent = `Reply to @${message.replyTo}`;
            container.append(reply);
        }

        const text = document.createElement("p");
        text.className = "message_text";
        text.textContent = message.text;

        const actions = document.createElement("div");
        actions.className = "message_actions";

        // Reply
        const replyBtn = document.createElement("button");
        replyBtn.textContent = "Reply";
        replyBtn.onclick = () => {
            if (message.author) {
                messageEl.value = `@${message.author} `;
                messageEl.focus();
            }
        };

        const copyBtn = document.createElement("button");
        copyBtn.textContent = "Copy";
        copyBtn.onclick = () => {
            const cleanText = message.text.replace(/^@\S+\s*/, "");
            navigator.clipboard.writeText(cleanText).then(() => {
                showFeedback("Copied!");
            });
        };

        actions.append(replyBtn, copyBtn);

        const myName = localStorage.getItem("mkchat:name");
        if (message.author === myName) {

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.onclick = () => {
                socket.emit("chat:delete", message.id, myName);
            };

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => {
                const currentText = message.text;
                const messageTextEl = container.querySelector(".message_text");

                messageEl.value = currentText;
                messageEl.focus();

                sendBtn.textContent = "Save";

                sendBtn.replaceWith(sendBtn.cloneNode(true));
                sendBtn = document.getElementById("send");

                const saveHandler = () => {
                    const newText = messageEl.value.trim();
                    if (!newText || newText === currentText) {
                        resetSendBtn();
                        return;
                    }

                    socket.emit("chat:edit", {
                        id: message.id,
                        newText,
                        author: myName
                    }, (err) => {
                        if (err) {
                            showFeedback(err, true);
                            return;
                        }
                        messageEl.value = "";
                        resetSendBtn();
                        showFeedback("Edited!");
                    });
                };

                sendBtn.addEventListener("click", saveHandler);
            };

            actions.append(editBtn, deleteBtn);
        }

        container.append(meta, text, actions);
        return container;
    };

    function resetSendBtn() {
        sendBtn.replaceWith(sendBtn.cloneNode(true));
        sendBtn = document.getElementById("send");
        sendBtn.textContent = "Send";
        sendBtn.addEventListener("click", sendMessage);
    }

    const appendMessage = (message) => {
        messagesEl.appendChild(createMessageElement(message));
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const renderMessages = (messages) => {
        messagesEl.innerHTML = "";
        messages.sort((a, b) => a.timestamp - b.timestamp);
        messages.forEach((m) => appendMessage(m));
    };

    const showFeedback = (text, isError = false) => {
        feedbackEl.textContent = text;
        feedbackEl.classList.toggle("feedback--error", isError);
    };

    const loadHistory = async () => {
        try {
            const response = await fetch("/api/messages");
            if (!response.ok) throw new Error("Failed to load history");

            const data = await response.json();
            renderMessages(data.messages || []);
            showFeedback("Loaded history");
        } catch (error) {
            console.error(error);
            showFeedback("Could not load history", true);
        }
    };

    const sendMessage = () => {
        const author = authorEl.value.trim() || "Anonymous";
        const text = messageEl.value.trim();

        if (!text) {
            showFeedback("Type something before sending", true);
            return;
        }

        localStorage.setItem("mkchat:name", author);

        sendBtn.disabled = true;
        showFeedback("Sending...");

        socket.emit("chat:send", {author, text}, (err) => {
            sendBtn.disabled = false;
            if (err) {
                showFeedback(err, true);
                return;
            }

            messageEl.value = "";
            messageEl.focus();
            showFeedback("Sent!");
        });
    };

    const init = () => {
        loadHistory();
        sendBtn.addEventListener("click", sendMessage);

        messageEl.addEventListener("keydown", (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    };

    socket.on("connect", () => setStatus("Online", true));
    socket.on("disconnect", () => setStatus("Offline", false));

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

