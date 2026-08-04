// piper-worker.js
importScripts("https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js");
importScripts("https://cdn.jsdelivr.net/npm/piper-wasm@latest/piper.js");

let piperTTS = null;

self.onmessage = async (e) => {
    const { type, text, speed } = e.data;

    if (type === 'INIT') {
        try {
            // Load the models directly from the Hugging Face CDN instead of GitHub
            piperTTS = await Piper.create({
                modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/el/el_GR/rapunzelina/low/el_GR-rapunzelina-low.onnx',
                modelConfigUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/el/el_GR/rapunzelina/low/el_GR-rapunzelina-low.onnx.json'
            });
            self.postMessage({ type: 'READY' });
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: err.message });
        }
    } 
    
    if (type === 'SPEAK' && piperTTS) {
        try {
            // Generate the raw audio floats
            const audioBuffer = await piperTTS.synthesize(text, { lengthScale: speed });
            self.postMessage({ type: 'AUDIO', audio: audioBuffer });
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: err.message });
        }
    }
};
