// --- 1. Initialization & UI Setup ---
const listContainer = document.getElementById('story-list-container');
const contentContainer = document.getElementById('content-container');
const btnDropdownToggle = document.getElementById('btn-dropdown-toggle');
const btnClearSelection = document.getElementById('btn-clear-selection');

let isPlaying = false;
let selectedStoryIds = []; // Array to track chosen stories

// Toggle the dropdown visibility
btnDropdownToggle.addEventListener('click', () => {
    listContainer.classList.toggle('show');
});

// Close the dropdown if the user clicks outside of it
document.addEventListener('click', (event) => {
    // Check if the click was outside the dropdown menu AND not on the toggle button itself
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
    
    // Toggle selection on click
    item.addEventListener('click', () => {
        const id = story.story_id;
        
        // If already selected, remove it
        if (selectedStoryIds.includes(id)) {
            selectedStoryIds = selectedStoryIds.filter(selectedId => selectedId !== id);
            item.classList.remove('selected');
        } else {
            // Otherwise, add it
            selectedStoryIds.push(id);
            item.classList.add('selected');
        }
        
        renderContent();
    });
    
    listContainer.appendChild(item);
});

// Clear All functionality
btnClearSelection.addEventListener('click', () => {
    selectedStoryIds = []; // Empty the array
    document.querySelectorAll('.story-item').forEach(el => el.classList.remove('selected'));
    renderContent();
});

function renderContent() {
    contentContainer.innerHTML = '';
    
    // Filter the nested data for only the selected stories
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

// Optional but recommended: trigger initial empty render
renderContent();

// --- 2. Toggles Logic ---
document.getElementById('toggle-greek').addEventListener('change', e => { document.body.classList.toggle('hide-greek', !e.target.checked); });
document.getElementById('toggle-literal').addEventListener('change', e => { document.body.classList.toggle('hide-literal', !e.target.checked); });
document.getElementById('toggle-smooth').addEventListener('change', e => { document.body.classList.toggle('hide-smooth', !e.target.checked); });

// --- 3. Slider Labels ---
const repeatValues = { 1: 1, 2: 2, 3: 3, 4: 5 }; // Maps slider pos to 1x, 2x, 3x, 5x
document.getElementById('slider-speed').addEventListener('input', e => document.getElementById('speed-val').innerText = e.target.value);
document.getElementById('slider-pause').addEventListener('input', e => document.getElementById('pause-val').innerText = e.target.value);
document.getElementById('slider-repeat').addEventListener('input', e => document.getElementById('repeat-val').innerText = repeatValues[e.target.value]);

// --- 4. Greek Diacritic Normalization for TTS ---
function cleanGreekForTTS(text) {
    return text.normalize('NFD') // Break chars into base + diacritics
               .replace(/[\u0300\u0302\u0342]/g, '\u0301') // Convert grave/circumflex to simple acute (\u0301)
               .replace(/[\u0313\u0314\u0304\u0306\u0345]/g, '') // Strip breathings, macrons, breves, iota subscripts
               .normalize('NFC'); // Recombine
}

// --- 5. Text-To-Speech Playback ---
function speakText(text, speed) {
    return new Promise((resolve) => {
        if (!text) return resolve();
        const utterance = new SpeechSynthesisUtterance(cleanGreekForTTS(text));
        utterance.lang = 'el-GR'; // Greek voice
        utterance.rate = speed;
        utterance.onend = resolve;
        utterance.onerror = resolve; // Continue even if error
        window.speechSynthesis.speak(utterance);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Click a single sentence
function speakSingleSentence(element) {
    window.speechSynthesis.cancel(); // Stop current speech
    const speed = parseFloat(document.getElementById('slider-speed').value);
    speakText(element.innerText, speed);
}

// Play all selected
document.getElementById('btn-play').addEventListener('click', async () => {
    if (isPlaying) return;
    isPlaying = true;
    
    window.speechSynthesis.cancel();
    
    const rows = document.querySelectorAll('.sentence-row');

    for (let row of rows) {
        if (!isPlaying) break; // Break out if Stop was pressed

        const greekText = row.querySelector('.greek-text').innerText;
        
        // Scroll into view & highlight
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('highlight');

        // Check slider values inside the loop so they update live
        let repeatSliderVal = document.getElementById('slider-repeat').value;
        let repeats = repeatValues[repeatSliderVal];

        for (let r = 0; r < repeats; r++) {
            if (!isPlaying) break;
            
            // Check speed inside the repeat loop to apply immediately on next read
            let speed = parseFloat(document.getElementById('slider-speed').value);
            
            await speakText(greekText, speed);
            
            // Check pause duration
            let pauseMs = parseFloat(document.getElementById('slider-pause').value) * 1000;
            if (r < repeats - 1 && isPlaying) await sleep(pauseMs); // Pause between repeats
        }
        
        row.classList.remove('highlight');
        if (isPlaying) {
            let pauseMs = parseFloat(document.getElementById('slider-pause').value) * 1000;
            await sleep(pauseMs); // Pause between sentences
        }
    }
    
    isPlaying = false;
});
// Stop playback
document.getElementById('btn-stop').addEventListener('click', () => {
    isPlaying = false;
    window.speechSynthesis.cancel();
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
});
