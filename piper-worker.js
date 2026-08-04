// piper-worker.js
let tts = null;

self.onmessage = async (e) => {
    const { type, text } = e.data;

    if (type === 'INIT') {
        try {
            // Dynamically import the stable VITS web library
            tts = await import('https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm');
            
            // Download the Greek voice model into the browser's hidden file system (OPFS)
            await tts.download('el_GR-rapunzelina-low');
            
            self.postMessage({ type: 'READY' });
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: err.message });
        }
    } 
    
    if (type === 'SPEAK' && tts) {
        try {
            // Predict returns an ArrayBuffer containing a standard WAV file
            const wavArrayBuffer = await tts.predict({
                text: text,
                voiceId: 'el_GR-rapunzelina-low'
            });
            
            // Transfer the buffer back to the main thread for processing
            self.postMessage({ type: 'AUDIO', audio: wavArrayBuffer }, [wavArrayBuffer]);
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: err.message });
        }
    }
};
