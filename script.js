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

// Fetch the data from the Google Apps Script API
async function fetchReaderData() {
    try {
        const response = await fetch(API_URL);
        const jsonData = await response.json();
        
        masterSetData = jsonData.sets;
        
        // Hide loading message, show controls, and build UI
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(controlsGroup) controlsGroup.style.display = 'flex';
        initMasterSets();
        
    } catch (error) {
        console.error("Error fetching data:", error);
        if(loadingMessage) {
            loadingMessage.innerText = "Error loading stories. Please check your Web App URL and ensure it is deployed to 'Anyone'.";
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

    // Ensure the second menu starts empty
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
    selectedGroupIds = []; // Clear selections when changing sets
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

// Toggle the dropdown visibility
btnDropdownToggle.addEventListener('click', () => {
    listContainer.classList.toggle('show');
});

// Close the dropdown if the user clicks outside of it
document.addEventListener('click', (event) => {
    if (!listContainer.contains(event.target) && event.target !== btnDropdownToggle) {
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
    const contentContainer = document.getElementById('content-container'); // Or whatever your container ID is
    contentContainer.innerHTML = '';

    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) return;

    // NEW LOGIC: Default to showing the entire book if nothing specific is selected
    let groupsToRender = [];
    if (selectedGroupIds.length === 0) {
        groupsToRender = activeSet.groups; 
    } else {
        groupsToRender = activeSet.groups.filter(group => selectedGroupIds.includes(group.group_id));
    }

    if (groupsToRender.length === 0) return;

    // Now loop through groupsToRender instead of a filtered list
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
            
            // We wrap the ID and Greek text in a flex container
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

// Boot up the app by initiating the fetch request
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
const repeatValues = { 1: 1, 2: 2, 3: 3, 4: 5 };

const sliderSpeed = document.getElementById('slider-speed');
const sliderPause = document.getElementById('slider-pause');
const sliderRepeat = document.getElementById('slider-repeat');

// 1. Force the physical slider thumbs to the correct default positions
sliderSpeed.value = 0.7;
sliderPause.value = 0.5;
sliderRepeat.value = 1;

// 2. Force the printed text labels to match those defaults
document.getElementById('speed-val').innerText = sliderSpeed.value;
document.getElementById('pause-val').innerText = sliderPause.value;
document.getElementById('repeat-val').innerText = repeatValues[parseInt(sliderRepeat.value)];

// 3. Listeners to update the text when you drag the sliders
sliderSpeed.addEventListener('input', e => {
    document.getElementById('speed-val').innerText = e.target.value;
});
sliderPause.addEventListener('input', e => {
    document.getElementById('pause-val').innerText = e.target.value;
});
sliderRepeat.addEventListener('input', e => {
    document.getElementById('repeat-val').innerText = repeatValues[parseInt(e.target.value)];
});


// --- 4. Greek Diacritic Normalization for TTS ---
function cleanForTTS(text) {
    let cleaned = text.normalize("NFD")
        .replace(/[\u0300\u0302\u0303\u0342]/g, '\u0301') 
        .replace(/[\u0313\u0314\u0304\u0306\u0345]/g, '') 
        .normalize("NFC")
        .replace(/(^|[\s,;:'"(\[·-])([άέήίόύώΆΈΉΊΌΎΏ])(?=[\s,;:.!?"'\)\]·-]|$)/g, (match, prefix, letter) => {
            return prefix + letter.normalize("NFD").replace(/\u0301/g, '').normalize("NFC");
        });
    
    cleaned = cleaned.replace(/(^|[\s,;:'"(\[·-])[ωώ](?=[\s,;:.!?"'\)\]·-]|$)/g, '$1ο');
    cleaned = cleaned.replace(/έπαυον/g, 'έπαβον'); 

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
                await sleep(pauseMs);
            }
        }
    } finally {
        isPlaying = false;
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
    // If we are already recording, this button acts as the Stop button
    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopRecording();
        return;
    }

    try {
        // 1. Ask the browser to capture the screen to get OS-level audio
        originalStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        // 2. Strip out the video and only keep the audio track
        const audioTracks = originalStream.getAudioTracks();
        if (audioTracks.length === 0) {
            alert("No audio track found. Make sure you toggle on 'Also share tab audio' in the popup!");
            originalStream.getTracks().forEach(track => track.stop());
            return;
        }

        const audioStream = new MediaStream(audioTracks);
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];

        // 3. Catch the audio data as it flows in
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        // 4. When recording stops, package it into a file and force a download
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = audioUrl;
            
            // Name the file based on the selected chapter if one exists
            const activeStory = document.querySelector('.story-item.selected');
            const fileName = activeStory ? activeStory.innerText.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'greek_audio';
            a.download = `${fileName}.webm`; 
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        // 5. Start the engine and update the UI
        mediaRecorder.start();
        btnRecord.innerHTML = svgStop;
        btnRecord.classList.add('recording-active');

        // Failsafe: If the user clicks "Stop Sharing" on the browser's floating banner instead of our button
        stream.getVideoTracks()[0].onended = () => {
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
    
    // Shut off the browser's "Sharing" indicator completely
    if (originalStream) {
        originalStream.getTracks().forEach(track => track.stop()); 
    }
    
    btnRecord.innerHTML = svgRecord;
    btnRecord.classList.remove('recording-active');
}
