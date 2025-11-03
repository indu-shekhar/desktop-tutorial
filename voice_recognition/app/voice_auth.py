import torch
from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding
from pyannote.audio import Audio
from scipy.spatial.distance import cdist
import torchaudio
import tempfile
import numpy as np

# Load model once
embedding_model = PretrainedSpeakerEmbedding("speechbrain/spkrec-ecapa-voxceleb", device=torch.device("cpu"))
audio_processor = Audio(sample_rate=16000, mono="downmix")

def extract_embedding(audio_path):
    waveform, sample_rate = audio_processor(audio_path)
    embedding = embedding_model(waveform[None])
    if isinstance(embedding, torch.Tensor):
        return embedding.detach().cpu().numpy()
    elif isinstance(embedding, np.ndarray):
        return embedding
    else:
        raise TypeError(f"Unexpected output type from embedding_model: {type(embedding)}")

def save_and_convert_audio(file_storage, out_path):
    # Save uploaded file to a temp file, convert to 16kHz mono wav
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        file_storage.save(tmp.name)
        waveform, sample_rate = torchaudio.load(tmp.name)
        # Convert to mono if not already
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        # Resample if needed
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)
        # Convert to int16 for compatibility
        if waveform.dtype != torch.int16:
            waveform = (waveform * (2**15)).to(torch.int16)
        torchaudio.save(out_path, waveform, 16000)
    return out_path

def verify_voice(stored_audio, test_audio, threshold=0.8):
    stored_embedding = extract_embedding(stored_audio)
    test_embedding = extract_embedding(test_audio)
    distance = cdist(test_embedding, stored_embedding, metric="cosine")[0][0]
    return distance < threshold, distance
