// --- 1. Initialization & UI Setup ---
const listContainer = document.getElementById('story-list-container');
const contentContainer = document.getElementById('content-container');
const btnDropdownToggle = document.getElementById('btn-dropdown-toggle');
const btnClearSelection = document.getElementById('btn-clear-selection');

let isPlaying = false;
let selectedStoryIds = [];

// Guard against data.js failing to load
if (typeof storyData === 'undefined') {
    console.error('storyData is not defined — check that data.js loaded correctly.');
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

// Populate the dropdown list
storyData.forEach(story => {
    const item = document.createElement('div');
    item.className = 'story-item';
    item.dataset.id = story.story_id;
    item.innerText = `${story.story_title_Greek} / ${story.story_title_English}`;

    item.addEventListener('click', () => {
        const id = story.story_id;
        if (selectedStoryIds.includes(id)) {
            selectedStoryIds = selectedStoryIds.filter(selectedId => selectedId !== id);
            item.classList.remove('selected');
        } else {
            selectedStoryIds.push(id);
            item.classList.add('selected');
        }
        // Keep dropdown open so multiple stories can be picked in one session
        renderContent();
    });

    listContainer.appendChild(item);
});

// Clear All
btnClearSelection.addEventListener('click', () => {
    selectedStoryIds = [];
    document.querySelectorAll('.story-item').forEach(el => el.classList.remove('selected'));
    listContainer.classList.remove('show');
    renderContent();
});

function renderContent() {
    contentContainer.innerHTML = '';
    window.scrollTo(0, 0);

    const selectedStories = storyData.filter(story => selectedStoryIds.includes(story.story_id));

    selectedStories.forEach(story => {
        const block = document.createElement('div');
        block.className = 'story-block';

        block.innerHTML = `
            <div class="story-title">
                <h2>${story.story_title_Greek}</h2>
                <h3>${story.story_title_English}</h3>
            </div>
        `;

        story.sentences.forEach(sentence => {
            const row = document.createElement('div');
            row.className = 'sentence-row';
            row.innerHTML = `
                <div class="col-greek">
                    <span class="greek-text" onclick="speakSingleSentence(this)">${sentence.greek}</span>
                    <span class="literal-text">${sentence.literal_english}</span>
                </div>
                <div class="col-english">
                    <span class="smooth-text">${sentence.smooth_english}</span>
                </div>
            `;
            block.appendChild(row);
        });

        contentContainer.appendChild(block);
    });
}

renderContent();

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
// Maps slider position to repeat count: 1→1, 2→2, 3→3, 4→5
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
        // Combined: grave, tilde, circumflex, and Greek perispomeni -> acute
        .replace(/[\u0300\u0302\u0303\u0342]/g, '\u0301') 
        // Combined: breathings, iota subscripts, macrons, and breves -> stripped
        .replace(/[\u0313\u0314\u0304\u0306\u0345]/g, '') 
        .normalize("NFC")
        // The Monosyllable Fix
        .replace(/(^|[\s,;:'"(\[·-])([άέήίόύώΆΈΉΊΌΎΏ])(?=[\s,;:.!?"'\)\]·-]|$)/g, (match, prefix, letter) => {
            return prefix + letter.normalize("NFD").replace(/\u0301/g, '').normalize("NFC");
        });
    
    // --- CUSTOM PHONETIC DICTIONARY ---
    // 1. Fix the ὦ issue by swapping a standalone ω for an omicron (ο)
    cleaned = cleaned.replace(/(^|[\s,;:'"(\[·-])[ωώ](?=[\s,;:.!?"'\)\]·-]|$)/g, '$1ο');
    
    // 2. Fixes the stress/diphthong on ἔπαυον
    cleaned = cleaned.replace(/έπαυον/g, 'έπαβον'); 

    return cleaned;
}

// --- 5. Text-To-Speech Playback ---
function speakText(text, speed) {
    return new Promise((resolve) => {
        if (!text) return resolve();
        const utterance = new SpeechSynthesisUtterance(cleanGreekForTTS(text));
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

// Click a single sentence to hear it
function speakSingleSentence(element) {
    window.speechSynthesis.cancel();
    const speed = parseFloat(document.getElementById('slider-speed').value);
    speakText(element.textContent.trim(), speed);
}

// Play all selected stories in sequence
document.getElementById('btn-play').addEventListener('click', async () => {
    if (isPlaying) return;
    isPlaying = true;
    window.speechSynthesis.cancel();

    const rows = document.querySelectorAll('.sentence-row');

    try {
        for (const row of rows) {
            if (!isPlaying) break;

            const greekText = row.querySelector('.greek-text').textContent.trim();

            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        // Always reset, whether playback finished naturally or was stopped
        isPlaying = false;
    }
});

// Stop playback
document.getElementById('btn-stop').addEventListener('click', () => {
    isPlaying = false;
    window.speechSynthesis.cancel();
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
});
