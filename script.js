"use strict";

// Load saved tasks and notes
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let notes = JSON.parse(localStorage.getItem("notes")) || [];

let voiceEnabled = false;
let database = null;

// Speak a message
function speak(message) {
    if (!("speechSynthesis" in window)) {
        alert("Voice is not supported in this browser.");
        return;
    }

    window.speechSynthesis.cancel();

    let speech = new SpeechSynthesisUtterance(message);
    speech.lang = "en-IN";
    speech.rate = 0.9;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}

// Enable voice reminders
function enableVoiceReminders() {
    if (!("speechSynthesis" in window)) {
        alert("Your browser does not support voice reminders.");
        return;
    }

    voiceEnabled = true;

    document.getElementById("voiceStatus").textContent =
        "Voice reminders are enabled. Keep TimeBuddy open.";

    speak("Hello! TimeBuddy voice reminders are now enabled.");
}

// Test the voice
function testVoice() {
    speak("Hello! This is your TimeBuddy voice reminder. Let's make today productive!");
}

// Save tasks
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Add a reminder
function addTask() {
    let task = document.getElementById("task").value.trim();
    let time = document.getElementById("time").value;

    if (task === "" || time === "") {
        alert("Please enter the task and select a time.");
        return;
    }

    tasks.push({
        task: task,
        time: time,
        lastSpoken: ""
    });

    saveTasks();

    document.getElementById("task").value = "";
    document.getElementById("time").value = "";

    showTasks();
    alert("Reminder added successfully!");
}

// Display tasks
function showTasks() {
    let list = document.getElementById("taskList");
    list.innerHTML = "";

    tasks.forEach(function(item, index) {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(item.task + " - " + item.time + " "));

        let button = document.createElement("button");
        button.type = "button";
        button.textContent = "Delete";

        button.onclick = function() {
            tasks.splice(index, 1);
            saveTasks();
            showTasks();
        };

        li.appendChild(button);
        list.appendChild(li);
    });
}

// Check whether a reminder is due
function checkReminders() {
    if (!voiceEnabled || !("speechSynthesis" in window)) {
        return;
    }

    let now = new Date();

    let currentTime =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

    let today =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    tasks.forEach(function(item) {
        if (item.time === currentTime && item.lastSpoken !== today) {
            item.lastSpoken = today;
            saveTasks();

            speak("Hello! It is time to " + item.task + ".");
        }
    });
}

// Save a note
function saveNote() {
    let title = document.getElementById("noteTitle").value.trim();
    let text = document.getElementById("noteText").value.trim();

    if (title === "" || text === "") {
        alert("Please enter the note title and note.");
        return;
    }

    notes.push({ title: title, text: text });
    localStorage.setItem("notes", JSON.stringify(notes));

    document.getElementById("noteTitle").value = "";
    document.getElementById("noteText").value = "";

    showNotes();
    alert("Note saved successfully!");
}

// Display notes
function showNotes() {
    let list = document.getElementById("noteList");
    list.innerHTML = "";

    notes.forEach(function(note, index) {
        let li = document.createElement("li");

        let heading = document.createElement("strong");
        heading.textContent = note.title + ": ";

        li.appendChild(heading);
        li.appendChild(document.createTextNode(note.text + " "));

        let button = document.createElement("button");
        button.type = "button";
        button.textContent = "Delete";

        button.onclick = function() {
            notes.splice(index, 1);
            localStorage.setItem("notes", JSON.stringify(notes));
            showNotes();
        };

        li.appendChild(button);
        list.appendChild(li);
    });
}

// Open document storage
if ("indexedDB" in window) {
    let request = indexedDB.open("TimeBuddy", 1);

    request.onupgradeneeded = function(event) {
        let db = event.target.result;

        if (!db.objectStoreNames.contains("documents")) {
            db.createObjectStore("documents", {
                keyPath: "id",
                autoIncrement: true
            });
        }
    };

    request.onsuccess = function(event) {
        database = event.target.result;
        showDocuments();
    };

    request.onerror = function() {
        alert("Could not open document storage.");
    };
}

// Save a document
function saveDocument() {
    let file = document.getElementById("file").files[0];

    if (!file) {
        alert("Please choose a document.");
        return;
    }

    if (!database) {
        alert("Document storage is still opening. Please try again.");
        return;
    }

    let transaction = database.transaction("documents", "readwrite");

    transaction.objectStore("documents").add({
        name: file.name,
        file: file
    });

    transaction.oncomplete = function() {
        document.getElementById("file").value = "";
        showDocuments();
        alert("Document saved successfully!");
    };

    transaction.onerror = function() {
        alert("Could not save this document.");
    };
}

// Display documents
function showDocuments() {
    if (!database) {
        return;
    }

    let list = document.getElementById("documentList");
    let transaction = database.transaction("documents", "readonly");
    let request = transaction.objectStore("documents").getAll();

    request.onsuccess = function() {
        list.innerHTML = "";

        request.result.forEach(function(doc) {
            let li = document.createElement("li");
            li.appendChild(document.createTextNode(doc.name + " "));

            let downloadButton = document.createElement("button");
            downloadButton.type = "button";
            downloadButton.textContent = "Download";

            downloadButton.onclick = function() {
                let url = URL.createObjectURL(doc.file);
                let link = document.createElement("a");

                link.href = url;
                link.download = doc.name;
                document.body.appendChild(link);
                link.click();
                link.remove();

                setTimeout(function() {
                    URL.revokeObjectURL(url);
                }, 60000);
            };

            let deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            deleteButton.onclick = function() {
                if (confirm("Delete this document?")) {
                    let tx = database.transaction("documents", "readwrite");
                    tx.objectStore("documents").delete(doc.id);

                    tx.oncomplete = function() {
                        showDocuments();
                    };
                }
            };

            li.appendChild(downloadButton);
            li.appendChild(deleteButton);
            list.appendChild(li);
        });
    };
}

// Display saved information
showTasks();
showNotes();

// Check reminders every five seconds
setInterval(checkReminders, 5000);