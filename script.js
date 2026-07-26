// --- 1. Initialization & UI Setup ---
const API_URL = "data.json";

const masterSetSelect = document.getElementById('select-master-set');
const listContainer = document.getElementById('story-list-container');
const contentContainer = document.getElementById('content-container');
const btnDropdownToggle = document.getElementById('btn-dropdown-toggle');
const btnClearSelection = document.getElementById('btn-clear-selection');
const loadingMessage = document.getElementById('loading-message');
const controlsGroup = document.getElementById('controls-selection-group');

let masterSetData = [];
let currentSetId = "";
let selectedGroupIds = [];
let isPlaying = false;

// Fetch the data from the JSON file or API endpoint
async function fetchReaderData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        
        masterSetData = jsonData.sets;
        
        // Hide loading message, show controls, and build UI
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (controlsGroup) controlsGroup.style.display = 'flex';
        initMasterSets();
        
    } catch (error) {
        console.error("Error fetching data:", error);
        if (loadingMessage) {
            loadingMessage.innerText = "Error loading stories. Please check your data source.";
            loadingMessage.style.color = "red";
        }
    }
}

// Populate the top-level Dropdown (Sets/Books)
function initMasterSets() {
    masterSetSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.innerText = "Pick your set...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    masterSetSelect.appendChild(defaultOption);
    
    masterSetData.forEach(set => {
        const option = document.createElement('option');
        option.value = set.set_id;
        option.innerText = set.set_title;
        masterSetSelect.appendChild(option);
    });

    currentSetId = "";
    listContainer.innerHTML = '';
}

// When the user changes the Set/Book, update the secondary Dropdown
masterSetSelect.addEventListener('change', (e) => {
    currentSetId = e.target.value;
    populateGroupDropdown();
});

// Populate the secondary Dropdown (Stories/Chapters)
function populateGroupDropdown() {
    listContainer.innerHTML = '';
    selectedGroupIds = []; 
    renderContent();

    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) return;

    activeSet.groups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'story-item';
        item.dataset.id = group.group_id;
        item.innerText = `${group.group_title}`;

        item.addEventListener('click', () => {
            const id = group.group_id;
            if (selectedGroupIds.includes(id)) {
                selectedGroupIds = selectedGroupIds.filter(selectedId => selectedId !== id);
                item.classList.remove('selected');
            } else {
                selectedGroupIds.push(id);
                item.classList.add('selected');
            }
            renderContent();
        });

        listContainer.appendChild(item);
    });
}

// Toggle dropdown visibility
btnDropdownToggle.addEventListener('click', () => {
    listContainer.classList.toggle('show');
});

// Close dropdown if user clicks outside container or toggle button
document.addEventListener('click', (event) => {
    if (!listContainer.contains(event.target) && !btnDropdownToggle.contains(event.target)) {
        listContainer.classList.remove('show');
    }
});

// Clear All selections
btnClearSelection.addEventListener('click', () => {
    selectedGroupIds = [];
    document.querySelectorAll('.story-item').forEach(el => el.classList.remove('selected'));
    listContainer.classList.remove('show');
    renderContent();
});

// Render the selected content to the screen
function renderContent() {
    contentContainer.innerHTML = '';

    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) return;

    let groupsToRender = selectedGroupIds.length === 0 
        ? activeSet.groups 
        : activeSet.groups.filter(group => selectedGroupIds.includes(group.group_id));

    if (groupsToRender.length === 0) return;

    groupsToRender.forEach(group => {
        const block = document.createElement('div');
        block.className = 'story-block';

        block.innerHTML = `
            <div class="story-title">
                <h2>${group.group_title}</h2>
            </div>
        `;

        group.sentences.forEach(sentence => {
            const row = document.createElement('div');
            row.className = 'sentence-row';
            
            row.innerHTML = `
                <div class="greek-wrapper">
                    <span class="sentence-id">${sentence.sentence_id}.</span>
                    <span class="greek-text" onclick="speakSingleSentence(this)">${sentence.greek}</span>
                </div>
                <span class="literal-text">${sentence.literal_english}</span>
                <span class="smooth-text">${sentence.smooth_english}</span>
            `;
            block.appendChild(row);
        });

        contentContainer.appendChild(block);
    });
}

// Boot app
fetchReaderData();


// --- 2. Toggles ---
document.getElementById('toggle-greek').addEventListener('change', e => {
    document.body.classList.toggle('hide-greek', !e.target.checked);
});
document.getElementById('toggle-literal').addEventListener('change', e => {
    document.body.classList.toggle('hide-literal', !e.target.checked);
});
document.getElementById('toggle-smooth').addEventListener('change', e => {
    document.body.classList.toggle('hide-smooth', !e.target.checked);
});


// --- 3. Slider Labels & Defaults ---
const repeatValues = { 1: 1, 2: 2, 3: 3, 4: 5 }; // Intentional step mapping (1x, 2x, 3x, 5x)

const sliderSpeed = document.getElementById('slider-speed');
const sliderPause = document.getElementById('slider-pause');
const sliderRepeat = document.getElementById('slider-repeat');

sliderSpeed.value = 0.7;
sliderPause.value = 0.5;
sliderRepeat.value = 1;

document.getElementById('speed-val').innerText = sliderSpeed.value;
document.getElementById('pause-val').innerText = sliderPause.value;
document.getElementById('repeat-val').innerText = repeatValues[parseInt(sliderRepeat.value)];

sliderSpeed.addEventListener('input', e => {
    document.getElementById('speed-val').innerText = e.target.value;
});
sliderPause.addEventListener('input', e => {
    document.getElementById('pause-val').innerText = e.target.value;
});
sliderRepeat.addEventListener('input', e => {
    document.getElementById('repeat-val').innerText = repeatValues[parseInt(e.target.value)];
});


// --- 4. Greek Diacritic Normalization & TTS Corrections ---
const TTS_REPLACEMENTS = {
    'έπαυον': 'έπαβον'
    // Add future TTS pronunciation fixes here as key-value pairs
};

function cleanForTTS(text) {
    let cleaned = text.normalize("NFD")
        .replace(/[\u0300\u0302\u0303\u0342]/g, '\u0301') 
        .replace(/[\u0313\u0314\u0304\u0306\u0345]/g, '') 
        .normalize("NFC")
        .replace(/(^|[\s,;:'"(\[·-])([άέήίόύώΆΈΉΊΌΎΏ])(?=[\s,;:.!?"'\)\]·-]|$)/g, (match, prefix, letter) => {
            return prefix + letter.normalize("NFD").replace(/\u0301/g, '').normalize("NFC");
        });
    
    // Convert standalone omega particles/interjections to omicron for accurate TTS voicing
    cleaned = cleaned.replace(/(^|[\s,;:'"(\[·-])[ωώΩΏ](?=[\s,;:.!?"'\)\]·-]|$)/g, '$1ο');

    // Apply specific word overrides
    for (const [target, replacement] of Object.entries(TTS_REPLACEMENTS)) {
        cleaned = cleaned.replace(new RegExp(target, 'g'), replacement);
    }

    return cleaned;
}


// --- 5. Text-To-Speech Playback ---
function speakText(text, speed) {
    return new Promise((resolve) => {
        if (!text) return resolve();
        const utterance = new SpeechSynthesisUtterance(cleanForTTS(text));
        utterance.lang = 'el-GR';
        utterance.rate = speed;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getHeaderHeight() {
    const header = document.getElementById('sticky-header');
    return header ? header.getBoundingClientRect().height : 0;
}
 
function scrollRowIntoView(row) {
    const headerHeight = getHeaderHeight();
    const rowTop = row.getBoundingClientRect().top + window.scrollY;
    const targetScrollY = rowTop - headerHeight - 12; 
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
}

function speakSingleSentence(element) {
    // Stop any active auto-play loop before speaking single sentence
    isPlaying = false;
    window.speechSynthesis.cancel();
    
    const speed = parseFloat(document.getElementById('slider-speed').value);
    speakText(element.textContent.trim(), speed);
}

document.getElementById('btn-play').addEventListener('click', async () => {
    if (isPlaying) return;
    isPlaying = true;
    window.speechSynthesis.cancel();

    const rows = document.querySelectorAll('.sentence-row');

    try {
        for (const row of rows) {
            if (!isPlaying) break;

            const greekText = row.querySelector('.greek-text').textContent.trim();

            scrollRowIntoView(row);
            row.classList.add('highlight');

            const repeats = repeatValues[parseInt(document.getElementById('slider-repeat').value)];

            for (let r = 0; r < repeats; r++) {
                if (!isPlaying) break;

                const speed = parseFloat(document.getElementById('slider-speed').value);
                await speakText(greekText, speed);

                const pauseMs = parseFloat(document.getElementById('slider-pause').value) * 1000;
                if (r < repeats - 1 && isPlaying) await sleep(pauseMs);
            }

            row.classList.remove('highlight');

            if (isPlaying) {
                const pauseMs = parseFloat(document.getElementById('slider-pause').value) * 1000;
                if (r < repeats - 1 && isPlaying) await sleep(pauseMs);
            }
        }
    } finally {
        isPlaying = false;
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    }
});

document.getElementById('btn-stop').addEventListener('click', () => {
    isPlaying = false;
    window.speechSynthesis.cancel();
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
});


// --- 6. Audio Recording (Tab Capture API) ---
let mediaRecorder;
let originalStream;
let audioChunks = [];
const btnRecord = document.getElementById('btn-record');

const svgRecord = `<svg viewBox="0 0 24 24" class="btn-icon"><circle cx="12" cy="12" r="7"/></svg>`;
const svgStop = `<svg viewBox="0 0 24 24" class="btn-icon"><path d="M6 6h12v12H6z"/></svg>`;

btnRecord.addEventListener('click', async () => {
    if (btnRecord.classList.contains('recording-active')) {
        stopRecording();
        return;
    }

    try {
        originalStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        const audioTracks = originalStream.getAudioTracks();
        if (audioTracks.length === 0) {
            alert("No audio track found. Make sure you toggle on 'Also share tab audio' in the popup!");
            originalStream.getTracks().forEach(track => track.stop());
            return;
        }

        const audioStream = new MediaStream(audioTracks);
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = audioUrl;
            
            // Build a clean, descriptive filename
            const selectedItems = Array.from(document.querySelectorAll('.story-item.selected'));
            let fileName = 'greek_audio';

            if (selectedItems.length === 1) {
                fileName = selectedItems[0].innerText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            } else if (selectedItems.length > 1) {
                fileName = `${currentSetId}_selected_chapters`;
            } else if (currentSetId) {
                fileName = `${currentSetId}_full_set`;
            }

            a.download = `${fileName}.webm`; 
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        mediaRecorder.start();
        btnRecord.innerHTML = svgStop;
        btnRecord.classList.add('recording-active');

        originalStream.getVideoTracks()[0].onended = () => {
            stopRecording();
        };

    } catch (err) {
        console.error("Recording canceled or failed:", err);
    }
});

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (originalStream) {
        originalStream.getTracks().forEach(track => track.stop()); 
    }
    
    btnRecord.innerHTML = svgRecord;
    btnRecord.classList.remove('recording-active');
}
