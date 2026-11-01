# CJ LIVE — por AjKaBaL
# Transcreve (em inglês) os .wav extraídos com sa-audio.js usando o Whisper, na GPU se tiver,
# guardando o tempo de cada palavra (para o sa-separar.js "engasgar" os palavrões).
# Salva a cada lote e continua de onde parou se for rodado de novo.
# Uso (com o python do Applio): python -I tools/sa-transcrever.py <pasta dos .wav> <saida.json> [limite]
import sys, os, json, glob
os.environ.setdefault('HF_HOME', 'D:/Applio/hf_cache')
import torch
from transformers import pipeline
import soundfile as sf
import numpy as np

folder, out = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 0
files = sorted(glob.glob(os.path.join(folder, '*.wav')))
if limit:
    files = files[:limit]
result = json.load(open(out, encoding='utf8')) if os.path.exists(out) else {}
files = [f for f in files if not isinstance(result.get(os.path.basename(f)), dict)]
# roda "de fundo": poucos núcleos e prioridade baixa, para não travar o PC
torch.set_num_threads(2)
try:
    import psutil
    psutil.Process().nice(psutil.IDLE_PRIORITY_CLASS)
except Exception:
    pass
gpu = torch.cuda.is_available()
asr = pipeline('automatic-speech-recognition', model='openai/whisper-base.en',
               device=0 if gpu else -1, torch_dtype=torch.float16 if gpu else torch.float32)


def load(f):
    data, rate = sf.read(f, dtype='float32')
    if data.ndim > 1:
        data = data.mean(axis=1)
    # whisper espera 16 kHz
    n = int(len(data) * 16000 / rate)
    data = np.interp(np.linspace(0, len(data), n, endpoint=False), np.arange(len(data)), data).astype('float32')
    return {'raw': data, 'sampling_rate': 16000}


batch = 8
for i in range(0, len(files), batch):
    chunk = files[i:i + batch]
    # falas curtas: limita os tokens para o Whisper não entrar em loop repetindo palavras
    texts = asr([load(f) for f in chunk], batch_size=batch, return_timestamps='word',
                generate_kwargs={'max_new_tokens': 48})
    for f, t in zip(chunk, texts):
        words = [[w['text'].strip(), *(round(x, 3) if x is not None else None for x in w['timestamp'])] for w in t.get('chunks', [])]
        result[os.path.basename(f)] = {'text': t['text'].strip(), 'words': words}
    json.dump(result, open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{len(result)} prontas', flush=True)
print('fim', flush=True)
