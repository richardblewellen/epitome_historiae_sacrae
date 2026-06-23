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
    contentContainer.innerHTML = '';
    window.scrollTo(0, 0);

    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) return;

    const selectedGroups = activeSet.groups.filter(group => selectedGroupIds.includes(group.group_id));

    selectedGroups.forEach(group => {
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
            <span class="greek-text" onclick="speakSingleSentence(this)">${sentence.greek}</span>
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


// --- 3. Slider Labels ---
const repeatValues = { 1: 1, 2: 2, 3: 3, 4: 5 };

document.getElementById('slider-speed').addEventListener('input', e => {
    document.getElementById('speed-val').innerText = e.target.value;
});
document.getElementById('slider-pause').addEventListener('input', e => {
    document.getElementById('pause-val').innerText = e.target.value;
});
document.getElementById('slider-repeat').addEventListener('input', e => {
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
