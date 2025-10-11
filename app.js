// Global vars for parsed data
let currentParsed = { date: null, shift: null, amount: null };

// Set default date for manual form (today)
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    loadEntries(); // Initial load entries
});

// Voice Recognition Setup (Fixed: No Repetition)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const output = document.getElementById('output');
const parsedDataDiv = document.getElementById('parsedData');
const saveBtn = document.getElementById('saveBtn');

if (!SpeechRecognition) {
    output.innerHTML = '<p class="error">Sorry, browser voice recognition support nahi karta. Chrome update karo!</p>';
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Hinglish for better accuracy; 'hi-IN' for pure Hindi
    recognition.continuous = false; // FIXED: Off - no looping, one utterance only
    recognition.interimResults = true; // Partial show, but final only save
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let previousTranscript = ''; // For de-dupe
    const voiceBtn = document.getElementById('voiceBtn');
    const stopBtn = document.getElementById('stopBtn');

    voiceBtn.addEventListener('click', () => {
        finalTranscript = ''; // FIXED: Always reset on start
        previousTranscript = '';
        recognition.start();
        voiceBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        output.innerHTML = '<p>🎤 सुन रहा हूँ... Clear aur slow bolo (e.g., "26 may ki shaam ko 126 point 56 ka doodh"). Auto-stop ho jaayega jab rukoge. No repetition!</p>';
        parsedDataDiv.style.display = 'none';
        saveBtn.style.display = 'none';
        console.log('Voice started - transcript reset'); // Debug
    });

    stopBtn.addEventListener('click', () => {
        recognition.stop();
        voiceBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        output.innerHTML += '<p>Manual stop! Parsing...</p>';
        console.log('Manual stop, final transcript:', finalTranscript); // Debug
        if (finalTranscript.trim()) {
            parseAndDisplay(finalTranscript);
        }
    });

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                const newPart = event.results[i][0].transcript;
                // FIXED: De-dupe - check if repetitive (last 10 chars match previous)
                if (newPart.slice(-10) !== previousTranscript.slice(-10)) {
                    finalTranscript += newPart;
                    previousTranscript = finalTranscript;
                    console.log('Added to final:', newPart); // Debug
                } else {
                    console.log('Skipped duplicate part'); // Debug
                }
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        output.innerHTML = `<p><strong>Final:</strong> ${finalTranscript}</p><p class="interim"><strong>Partial:</strong> ${interimTranscript}</p>`;
        console.log('Current final transcript:', finalTranscript); // Debug
    };

    recognition.onend = () => {
        voiceBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        console.log('Recognition ended, final transcript:', finalTranscript); // Debug
        if (finalTranscript.trim() && finalTranscript !== '') {
            output.innerHTML += '<p>Auto-stopped! Parsing...</p>';
            parseAndDisplay(finalTranscript);
        } else {
            output.innerHTML += '<p class="error">Kuch capture nahi hua. Dobara try karo!</p>';
        }
    };

    let silenceTimer;
    recognition.onstart = () => {
        silenceTimer = setTimeout(() => {
            if (recognition) {
                recognition.stop();
                output.innerHTML += '<p>5 sec silence - auto stopped (no repetition).</p>';
            }
        }, 5000); // FIXED: Reduced to 5 sec for quicker end
        console.log('Listening started'); // Debug
    };

    recognition.onerror = (event) => {
        clearTimeout(silenceTimer);
        let errorMsg = 'Voice Error: ';
        if (event.error === 'no-speech') errorMsg += 'Kuch bola nahi. Clear bolo aur dobara try!';
        else if (event.error === 'audio-capture') errorMsg += 'Mic capture fail (repetition possible). Permission/hardware check karo!';
        else if (event.error === 'not-allowed') errorMsg += 'Mic permission deny. Browser settings allow karo!';
        else if (event.error === 'aborted') errorMsg += 'Session aborted (repetition avoid). Dobara start karo!';
        else if (event.error === 'network') errorMsg += 'Internet issue. Online raho!';
        else errorMsg += event.error;
        output.innerHTML = `<p class="error">${errorMsg}</p>`;
        console.error('Recognition error:', event.error); // Debug
        voiceBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
    };
}

// Parse and Display (same as before, no change needed)
function parseAndDisplay(transcript) {
    const fullTranscript = transcript.toLowerCase().trim();
    console.log('Parsing transcript:', fullTranscript); // Debug
    output.innerHTML += `<p><strong>Full बोला गया:</strong> ${fullTranscript}</p>`;

    // Improved Date Regex (same)
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

    // Improved Shift Regex (same)
    let shift = null;
    const shiftMatch = fullTranscript.match(/(subah|सुबह|morning|shaam|शाम|evening)/i);
    if (shiftMatch) {
        const shiftWord = shiftMatch[0].toLowerCase();
        shift = (shiftWord.includes('shaam') || shiftWord.includes('evening') || shiftWord.includes('शाम')) ? 'evening' : 'morning';
    }

    // Improved Amount Regex (same)
    let amount = 0;
    let amountStr = null;
    const amountMatch = fullTranscript.match(/(\d+(?:\s*point\s*\d+)?|\d+(?:[.,]\d+)?)\s*(ka|का|litre|liter|kg|doodh|दूध)/i);
    if (amountMatch) {
        amountStr = amountMatch[1].replace(/point/g, '.').replace(',', '.');
        amount = parseFloat(amountStr);
    }
    console.log('Parsed - Date:', date, 'Shift:', shift, 'Amount:', amount); // Debug

    // Strict Check (same)
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
        console.log('Parse success!');
    } else {
        const errorMsg = `❌ Saari info nahi mili: ${missing.join(', ')}. Dobara clear bolo! Example: "Aaj shaam ko 126 point 56 ka doodh hua"`;
        output.innerHTML += `<p class="error">${errorMsg}</p>`;
        console.log('Parse fail, missing:', missing);
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
