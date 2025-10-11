// Global vars for parsed data
let currentParsed = { date: null, shift: null, amount: null };

// Set default date for manual form (today)
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    loadEntries(); // Initial load entries
});

// Voice Recognition Setup (Fixed: Proper stop/reset, no "already started" error)
const output = document.getElementById('output');
const parsedDataDiv = document.getElementById('parsedData');
const saveBtn = document.getElementById('saveBtn');

let recognition; // Will be recreated each time

function createRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        output.innerHTML = '<p class="error">Sorry, browser voice recognition support nahi karta. Chrome update karo!</p>';
        return null;
    }
    const newRecog = new SpeechRecognition();
    newRecog.lang = 'hi-IN'; // Pure Hindi
    newRecog.continuous = false; // Single utterance
    newRecog.interimResults = false; // Only final
    newRecog.maxAlternatives = 1;
    console.log('New recognition object created'); // Debug
    return newRecog;
}

const voiceBtn = document.getElementById('voiceBtn');
const stopBtn = document.getElementById('stopBtn');

voiceBtn.addEventListener('click', () => {
    // FIXED: Stop any existing session first
    if (recognition) {
        try {
            if (recognition.running) { // Check if running (non-standard, but works in Chrome)
                recognition.abort(); // Force abort to clear state
                console.log('Aborting previous session'); // Debug
            }
        } catch (e) {
            console.log('Previous session already ended'); // Debug
        }
    }

    // FIXED: Create fresh recognition each time
    recognition = createRecognition();
    if (!recognition) return;

    let finalTranscript = ''; // Local per session
    let silenceTimer;

    // Event handlers (re-attach fresh)
    recognition.onstart = () => {
        finalTranscript = ''; // Reset
        voiceBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        output.innerHTML = '<p>🎤 सुन रहा हूँ... Clear aur slow bolo (5-7 sec). Auto-stop ho jaayega. Example: "26 may ki shaam ko 126 point 56 ka doodh hua".</p>';
        parsedDataDiv.style.display = 'none';
        saveBtn.style.display = 'none';
        console.log('Fresh recognition started'); // Debug
    };

    recognition.onresult = (event) => {
        finalTranscript = event.results[0][0].transcript; // Only final
        output.innerHTML = `<p><strong>बोला गया:</strong> ${finalTranscript}</p>`;
        console.log('Result received - transcript:', finalTranscript); // Debug
    };

    recognition.onend = () => {
        clearTimeout(silenceTimer);
        voiceBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        console.log('Recognition ended - parsing:', finalTranscript ? 'Yes' : 'No transcript'); // Debug
        if (finalTranscript.trim()) {
            output.innerHTML += '<p>Stopped! Parsing...</p>';
            parseAndDisplay(finalTranscript);
        } else {
            output.innerHTML += '<p class="error">Kuch capture nahi hua. Mic check karo aur dobara try!</p>';
        }
        // FIXED: Cleanup - set to null after end
        recognition = null;
    };

    recognition.onerror = (event) => {
        clearTimeout(silenceTimer);
        let errorMsg = 'Voice Error: ';
        if (event.error === 'no-speech') {
            errorMsg += 'Kuch bola nahi. Dobara bolo!';
        } else if (event.error === 'audio-capture') {
            errorMsg += 'Mic fail. Permission/hardware check!';
        } else if (event.error === 'not-allowed') {
            errorMsg += 'Mic permission deny. Allow karo!';
        } else if (event.error === 'aborted') {
            errorMsg += 'Session aborted. Dobara start!';
        } else if (event.error === 'network') {
            errorMsg += 'Internet issue!';
        } else {
            // FIXED: Handle "already started" specifically
            if (event.error.includes('already') || event.message.includes('started')) {
                errorMsg += 'Previous session stuck. Page reload karo ya dobara try!';
                recognition = null; // Reset
            } else {
                errorMsg += event.error;
            }
        }
        output.innerHTML = `<p class="error">${errorMsg}</p>`;
        console.error('Error details:', event); // Debug
        voiceBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        recognition = null; // FIXED: Reset on error
    };

    // Silence timer
    silenceTimer = setTimeout(() => {
        if (recognition) {
            recognition.abort(); // Force end
            console.log('Silence timer - aborted'); // Debug
        }
    }, 7000);

    // Start the fresh recognition
    try {
        recognition.start();
        console.log('recognition.start() called successfully'); // Debug
    } catch (e) {
        console.error('Start failed:', e);
        output.innerHTML += '<p class="error">Start error: ' + e.message + '. Page reload karo!</p>';
        recognition = null;
    }
});

stopBtn.addEventListener('click', () => {
    if (recognition) {
        recognition.abort(); // Force stop
        console.log('Manual abort called'); // Debug
    }
    voiceBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    output.innerHTML += '<p>Manual stop! Parsing if captured.</p>';
});

// Parse and Display (same as before - no change)
function parseAndDisplay(transcript) {
    const fullTranscript = transcript.toLowerCase().trim();
    console.log('Parsing started - full transcript:', fullTranscript); // Debug
    output.innerHTML += `<p><strong>Full बोला गया:</strong> ${fullTranscript}</p>`;

    let date = null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (fullTranscript.includes('aaj') || fullTranscript.includes('आज')) {
        date = today;
    } else if (fullTranscript.includes('kal') || fullTranscript.includes('कल')) {
        date = tomorrow;
    } else {
        const dateMatch = fullTranscript.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)?\s*(ki|को)?/i);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const monthStr = dateMatch[2] ? dateMatch[2].toLowerCase() : '';
            const months = {
                'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
                'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
                'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
                'nov': 11, 'november': 11, 'dec': 12, 'december': 12
            };
            const month = months[monthStr];
            if (month && day > 0 && day <= 31) {
                const year = new Date().getFullYear();
                date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
    }

    let shift = null;
    const shiftMatch = fullTranscript.match(/(subah|सुबह|morning|shaam|शाम|evening)/i);
    if (shiftMatch) {
        const shiftWord = shiftMatch[0].toLowerCase();
        shift = (shiftWord.includes('shaam') || shiftWord.includes('evening') || shiftWord.includes('शाम')) ? 'evening' : 'morning';
    }

    let amount = 0;
    const amountMatch = fullTranscript.match(/(\d+(?:\s*point\s*\d+)?|\d+(?:[.,]\d+)?)\s*(ka|का|litre|liter|kg|doodh|दूध)/i);
    if (amountMatch) {
        const amountStr = amountMatch[1].replace(/point/g, '.').replace(',', '.');
        amount = parseFloat(amountStr);
    }
    console.log('Parsed values - Date:', date, 'Shift:', shift, 'Amount:', amount); // Debug

    let missing = [];
    if (!date) missing.push('Date (e.g., "26 may" ya "aaj")');
    if (!shift) missing.push('Shift (subah/shaam)');
    if (amount <= 0) missing.push('Amount (e.g., "126 point 56 ka doodh")');

    if (missing.length === 0) {
        currentParsed = { date, shift, amount };
        document.getElementById('parsedDate').innerHTML = `📅 Date: ${date}`;
        document.getElementById('parsedShift').innerHTML = `⏰ Shift: ${shift === 'morning' ? 'Subah' : 'Shaam'}`;
        document.getElementById('parsedAmount').innerHTML = `💰 Amount: ${amount}`;
        parsedDataDiv.style.display = 'block';
        saveBtn.style.display = 'block';
        output.innerHTML += '<p class="success">✅ Parsed successfully! Save karo.</p>';
        console.log('Parse success - data ready'); // Debug
    } else {
        const errorMsg = `❌ Saari info nahi mili: ${missing.join(', ')}. Dobara clear bolo! Example: "26 may ki shaam ko 126 point 56 ka doodh hua"`;
        output.innerHTML += `<p class="error">${errorMsg}</p>`;
        console.log('Parse fail - missing:', missing); // Debug
    }
}

// Save Function (same as before)
function saveToFirebase(date, shift, amount, isManual = false) {
    const key = `${date}_${shift}`;
    const ref = db.ref('milk-entries/' + key);
    const entry = {
        date: date,
        shift: shift,
        amount: amount,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    ref.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const existingAmount = snapshot.val().amount;
            const confirmOverwrite = confirm(`⚠️ Iss date (${date}) aur shift (${shift}) ka hisab toh already hai (Amount: ${existingAmount}). Pakka change krna hai? (Yes = Overwrite, No = Cancel)`);
            if (!confirmOverwrite) {
                output.innerHTML += '<p class="warning">Cancelled! Kuch nahi badla.</p>';
                return;
            }
        }

        ref.set(entry)
            .then(() => {
                const msg = isManual ? 'Manual ' : '';
                output.innerHTML += `<p class="success">✅ ${msg}Saved/Updated! Date: ${date}, Shift: ${shift}, Amount: ${amount}</p>`;
                if (!isManual) {
                    parsedDataDiv.style.display = 'none';
                    saveBtn.style.display = 'none';
                }
                loadEntries();
            })
            .catch((error) => {
                output.innerHTML += `<p class="error">Error saving: ${error.message}</p>`;
            });
    }).catch((error) => {
        output.innerHTML += `<p class="error">Check error: ${error.message}</p>`;
    });
}

// Voice Save Button Event (same)
saveBtn.addEventListener('click', () => {
    if (currentParsed.date && currentParsed.shift && currentParsed.amount > 0) {
        saveToFirebase(currentParsed.date, currentParsed.shift, currentParsed.amount);
    } else {
        alert('Parsed data invalid! Dobara voice input karo.');
    }
});

// Manual Save Button Event (same)
document.getElementById('manualSaveBtn').addEventListener('click', () => {
    const date = document.getElementById('manualDate').value;
    const shift = document.getElementById('manualShift').value;
    const amountInput = document.getElementById('manualAmount').value;
    const amount = parseFloat(amountInput);

    if (!date || !shift || !amountInput || amount <= 0) {
        alert('Saari fields bharein: Date, Shift, Amount (positive number)!');
        return;
    }

    saveToFirebase(date, shift, amount, true);
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('manualShift').value = '';
    document.getElementById('manualAmount').value = '';
});

// Load Entries (same)
function loadEntries() {
    const entriesDiv = document.getElementById('entries');
    db.ref('milk-entries').on('value', (snapshot) => {
        entriesDiv.innerHTML = '<h2>पिछले Entries:</h2>';
        const data = snapshot.val();
        if (data) {
            const entries = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));
            if (entries.length === 0) {
                entriesDiv.innerHTML += '<p>कोई entry नहीं।</p>';
            } else {
                entries.forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.className = 'entry';
                    const shiftText = entry.shift === 'morning' ? 'Subah' : 'Shaam';
                    const dateObj = new Date(entry.date);
                    const formattedDate = dateObj.toLocaleDateString('hi-IN');
                    entryDiv.innerHTML = `
                        <strong>Date:</strong> ${formattedDate} | <strong>Shift:</strong> ${shiftText} | <strong>Amount:</strong> ${entry.amount}<br>
                        <small>Time: ${new Date(entry.timestamp).toLocaleString('hi-IN')}</small>
                    `;
                    entriesDiv.appendChild(entryDiv);
                });
            }
        } else {
            entriesDiv.innerHTML += '<p>कोई entry नहीं।</p>';
        }
    });
}
