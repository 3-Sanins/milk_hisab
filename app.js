// Global vars for parsed data
let currentParsed = { date: null, shift: null, amount: null };
let recognition; // Will be recreated each time

// Wait for DOM to load, then initialize everything
document.addEventListener('DOMContentLoaded', function() {
    // FIXED: All getElementById inside DOMContentLoaded to avoid null errors
    const output = document.getElementById('output');
    const parsedDataDiv = document.getElementById('parsedData');
    const saveBtn = document.getElementById('saveBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const stopBtn = document.getElementById('stopBtn');
    const textInput = document.getElementById('textInput');
    const parseTextBtn = document.getElementById('parseTextBtn');
    const manualDate = document.getElementById('manualDate');
    const manualShift = document.getElementById('manualShift');
    const manualAmount = document.getElementById('manualAmount');
    const manualSaveBtn = document.getElementById('manualSaveBtn');
    const entriesDiv = document.getElementById('entries');

    if (!voiceBtn || !output || !parsedDataDiv || !saveBtn || !textInput || !parseTextBtn || !manualDate || !manualShift || !manualAmount || !manualSaveBtn || !entriesDiv) {
        console.error('Missing DOM elements! Check HTML IDs.');
        output.innerHTML = '<p class="error">Page load error. HTML check karo!</p>';
        return;
    }

    // Set default date for manual form (today)
    manualDate.value = new Date().toISOString().split('T')[0];

    // Voice Recognition Setup (Fixed: No repetition, proper reset, "already started" handle)
    function createRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            output.innerHTML = '<p class="error">Sorry, browser voice recognition support nahi karta. Manual text input use karo!</p>';
            return null;
        }
        const newRecog = new SpeechRecognition();
        newRecog.lang = 'hi-IN'; // Hindi for better local accuracy
        newRecog.continuous = false; // Single utterance only, no looping
        newRecog.interimResults = false; // Only final result, no partial
        newRecog.maxAlternatives = 1;
        console.log('New recognition object created'); // Debug
        return newRecog;
    }

    voiceBtn.addEventListener('click', () => {
        // FIXED: Stop any existing session first to avoid "already started"
        if (recognition) {
            try {
                if (recognition.running) {
                    recognition.abort(); // Force abort to clear state
                    console.log('Aborting previous session'); // Debug
                }
            } catch (e) {
                console.log('Previous session already ended or error:', e); // Debug
            }
        }

        // FIXED: Create fresh recognition each time for clean start
        recognition = createRecognition();
        if (!recognition) return;

        let finalTranscript = ''; // Local per session, reset every time
        let silenceTimer;

        // Event handlers (re-attach fresh for new instance)
        recognition.onstart = () => {
            finalTranscript = ''; // Ensure reset
            voiceBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            output.innerHTML = '<p>🎤 सुन रहा हूँ... Clear aur slow bolo (e.g., "26 may ki shaam ko 126.56 ka doodh hua"). Auto-stop ho jaayega jab rukoge (5-7 sec).</p>';
            parsedDataDiv.style.display = 'none';
            saveBtn.style.display = 'none';
            console.log('Fresh recognition started successfully'); // Debug
        };

        recognition.onresult = (event) => {
            // FIXED: Only final result (interim false, so clean)
            finalTranscript = event.results[0][0].transcript;
            output.innerHTML = `<p><strong>बोला गया:</strong> ${finalTranscript}</p>`;
            console.log('Result received - transcript:', finalTranscript); // Debug
        };

        recognition.onend = () => {
            clearTimeout(silenceTimer);
            voiceBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            console.log('Recognition ended - parsing transcript:', finalTranscript ? finalTranscript : 'No transcript'); // Debug
            if (finalTranscript.trim()) {
                output.innerHTML += '<p>Auto-stopped! Parsing...</p>';
                parseAndDisplay(finalTranscript);
            } else {
                output.innerHTML += '<p class="error">Kuch capture nahi hua. Mic check karo aur dobara try karo! Ya manual text use karo.</p>';
            }
            // FIXED: Cleanup - set to null after end to allow fresh start
            recognition = null;
        };

        recognition.onerror = (event) => {
            clearTimeout(silenceTimer);
            let errorMsg = 'Voice Error: ';
            if (event.error === 'no-speech') {
                errorMsg += 'Kuch bola nahi (5 sec silence). Dobara start karo aur clear bolo!';
            } else if (event.error === 'audio-capture') {
                errorMsg += 'Mic capture fail. Permission/hardware check karo!';
            } else if (event.error === 'not-allowed') {
                errorMsg += 'Mic permission deny. Browser settings (lock icon) mein allow karo!';
            } else if (event.error === 'aborted') {
                errorMsg += 'Session aborted. Dobara button dabaao!';
            } else if (event.error === 'network') {
                errorMsg += 'Internet issue. Online raho!';
            } else {
                // FIXED: Handle "already started" specifically
                if (event.error.includes('already') || event.message.includes('started')) {
                    errorMsg += 'Previous session stuck. Page reload karo ya manual text use karo!';
                    recognition = null; // Reset on this error
                } else {
                    errorMsg += event.error;
                }
            }
            output.innerHTML = `<p class="error">${errorMsg}</p>`;
            console.error('Recognition error details:', event); // Debug full error
            voiceBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            recognition = null; // FIXED: Always reset on error
        };

        // FIXED: Silence timer for auto-stop (7 sec max)
        silenceTimer = setTimeout(() => {
            if (recognition) {
                recognition.abort(); // Force end on silence
                console.log('Silence timer triggered - force abort'); // Debug
            }
        }, 7000);

        // Start the fresh recognition
        try {
            recognition.start();
            console.log('recognition.start() called successfully'); // Debug
        } catch (e) {
            console.error('Start failed:', e);
            output.innerHTML += `<p class="error">Start error: ${e.message}. Page reload karo ya manual text use karo!</p>`;
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
        output.innerHTML += '<p>Manual stop! Agar kuch bola, to parsing ho gaya hoga.</p>';
    });

    // Manual Text Parse Button
    parseTextBtn.addEventListener('click', () => {
        const textInputValue = textInput.value.trim();
        if (!textInputValue) {
            alert('Sentence type karo (e.g., "26 may ki shaam ko 126.56 ka doodh hua")!');
            return;
        }
        output.innerHTML = '<p>Manual text parsing...</p>';
        parseAndDisplay(textInputValue); // Same parse as voice
        textInput.value = ''; // Clear input
    });

    // Manual Save Button Event
    manualSaveBtn.addEventListener('click', () => {
        const date = manualDate.value;
        const shift = manualShift.value;
        const amountInput = manualAmount.value;
        const amount = parseFloat(amountInput);

        if (!date || !shift || !amountInput || amount <= 0) {
            alert('Saari fields bharein: Date, Shift, Amount (positive number)!');
            return;
        }

        saveToFirebase(date, shift, amount, true);
        // Clear form
        manualDate.value = new Date().toISOString().split('T')[0];
        manualShift.value = '';
        manualAmount.value = '';
    });

    // Voice Save Button Event
    saveBtn.addEventListener('click', () => {
        if (currentParsed.date && currentParsed.shift && currentParsed.amount > 0) {
            saveToFirebase(currentParsed.date, currentParsed.shift, currentParsed.amount);
        } else {
            alert('Parsed data invalid! Dobara input karo.');
        }
    });

    // Parse and Display Function (Improved: "aaj" resolve, default shift, better amount)
    function parseAndDisplay(transcript) {
        const fullTranscript = transcript.toLowerCase().trim();
        output.innerHTML += `<p><strong>Full बोला गया / Typed:</strong> ${fullTranscript}</p>`;
        console.log('Parsing transcript:', fullTranscript); // Debug

        // Date Parsing (Improved: "aaj" as today, "kal" as tomorrow, default current month/year)
        let date = null;
        const today = new Date().toISOString().split('T')[0]; // e.g., "2024-05-26"
        if (fullTranscript.includes('aaj') || fullTranscript.includes('आज')) {
            date = today; // Resolved: Current date
            console.log('Resolved "aaj" to:', date); // Debug
        } else if (fullTranscript.includes('kal') || fullTranscript.includes('कल')) {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            date = tomorrow;
            console.log('Resolved "kal" to:', date); // Debug
        } else {
            // Regex for DD month (assume current year)
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
                const month = months[monthStr] || new Date().getMonth() + 1; // Default current month if missing
                const year = new Date().getFullYear(); // Current year
                date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                console.log('Regex date resolved to:', date); // Debug
            }
        }

        // Shift Parsing (Improved: More variations, default 'morning' for "aaj")
        let shift = null;
        const shiftMatch = fullTranscript.match(/(subah|सुबह|morning|shaam|शाम|evening|dupahar)/i);
        if (shiftMatch) {
            const shiftWord = shiftMatch[0].toLowerCase();
            if (shiftWord.includes('shaam') || shiftWord.includes('evening') || shiftWord.includes('शाम')) {
                shift = 'evening';
            } else if (shiftWord.includes('subah') || shiftWord.includes('morning') || shiftWord.includes('सुबह')) {
                shift = 'morning';
            } else if (shiftWord.includes('dupahar')) {
                shift = 'morning'; // Afternoon as morning for simplicity
            }
            console.log('Shift resolved to:', shift); // Debug
        }
        // FIXED: Default 'morning' if "aaj" and no shift specified
        if (!shift && date === today) {
            shift = 'morning';
            console.log('Default shift "morning" set for aaj'); // Debug
        }

        // Amount Parsing (Improved: Handle "point"/"bindu" for decimals, more units)
        let amount = 0;
        const amountMatch = fullTranscript.match(/(\d+(?:\s*(point|bindu)\s*\d+)?|\d+(?:[.,]\d+)?)\s*(ka|का|litre|liter|kg|doodh|दूध)/i);
        if (amountMatch) {
            let amtStr = amountMatch[1].replace(/point|bindu/g, '.').replace(',', '.');
            amount = parseFloat(amtStr);
            if (isNaN(amount)) amount = 0;
            console.log('Amount resolved to:', amount); // Debug
        }

        // Strict Check (All three required)
        let missing = [];
        if (!date) missing.push('Date (e.g., "26 may" ya "aaj")');
        if (!shift) missing.push('Shift (subah/shaam)');
        if (amount <= 0) missing.push('Amount (e.g., "126 point 56 ka doodh")');

        if (missing.length === 0) {
            // Success: Set parsed data and display in big font
            currentParsed = { date, shift, amount };
            document.getElementById('parsedDate').innerHTML = `📅 Date: ${date}`;
            document.getElementById('parsedShift').innerHTML = `⏰ Shift: ${shift === 'morning' ? 'Subah' : 'Shaam'}`;
            document.getElementById('parsedAmount').innerHTML = `💰 Amount: ${amount}`;
            parsedDataDiv.style.display = 'block';
            saveBtn.style.display = 'block';
            output.innerHTML += '<p class="success">✅ Parsed successfully! Niche save button se confirm karo.</p>';
            console.log('Parse success!'); // Debug
        } else {
            // Error: Don't save, ask to retry
            const errorMsg = `❌ Saari info nahi mili: ${missing.join(', ')}. Poora sentence dobara bolo/type karo! Example: "26 may ki shaam ko 126.56 ka doodh hua" ya "aaj subah ko 150 ka doodh"`;
            output.innerHTML += `<p class="error">${errorMsg}</p>`;
            console.log('Parse fail, missing:', missing); // Debug
        }
    }

    // Save to Firebase (With existing check and warning)
    function saveToFirebase(date, shift, amount, isManual = false) {
        const key = `${date}_${shift}`; // e.g., "2024-05-26_evening"
        const ref = db.ref('milk-entries/' + key);
        const entry = {
            date: date,
            shift: shift,
            amount: amount,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Check if exists (warning for overwrite)
        ref.once('value').then((snapshot) => {
            if (snapshot.exists()) {
                const existingAmount = snapshot.val().amount;
                const confirmOverwrite = confirm(`⚠️ Iss date (${date}) aur shift (${shift}) ka hisab toh already hai (Amount: ${existingAmount}). Pakka change krna hai? (Yes = Overwrite, No = Cancel)`);
                if (!confirmOverwrite) {
                    output.innerHTML += '<p class="warning">Cancelled! Kuch nahi badla.</p>';
                    return;
                }
            }

            // Save/Update
            ref.set(entry)
                .then(() => {
                    const msg = isManual ? 'Manual ' : '';
                    output.innerHTML += `<p class="success">✅ ${msg}Saved/Updated! Date: ${date}, Shift: ${shift}, Amount: ${amount}</p>`;
                    if (!isManual) {
                        parsedDataDiv.style.display = 'none';
                        saveBtn.style.display = 'none';
                    }
                    loadEntries(); // Refresh list
                })
                .catch((error) => {
                    output.innerHTML += `<p class="error">Error saving: ${error.message}</p>`;
                });
        }).catch((error) => {
            output.innerHTML += `<p class="error">Check error: ${error.message}</p>`;
        });
    }

    // Load Entries from Firebase (Real-time)
    // Load Entries from Firebase (Real-time)
    function loadEntries() {
      db.ref('milk-entries').on('value', (snapshot) => {
        entriesDiv.innerHTML = '<h2>पिछले Entries:</h2>';
        const data = snapshot.val();
        if (data) {
          const entries = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date)); // Latest first
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
          entriesDiv.innerHTML += '<p>कोई entry नहीं। Firebase config check karo.</p>';
        }
      });
    }

    // Initial load entries on page load
    loadEntries();
    });
