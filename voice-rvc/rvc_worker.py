# CJ LIVE — por AjKaBaL
# Worker do CJ LIVE: mantém o modelo RVC do CJ carregado e converte as falas do TTS.
# Roda com o Python do Applio e cwd = pasta do Applio (o Applio resolve caminhos pelo cwd).
# Protocolo: uma linha JSON por pedido no stdin {"id","input","output"};
# resposta numa linha que começa com "@@CJ@@ " no stdout (o resto do stdout é log do Applio).
import json
import os
import sys
import time

sys.path.insert(0, os.getcwd())

from rvc.infer.infer import VoiceConverter  # noqa: E402

MODEL = os.environ["CJ_RVC_MODEL"]
INDEX = os.environ.get("CJ_RVC_INDEX", "")
PITCH = int(os.environ.get("CJ_RVC_PITCH", "0"))
INDEX_RATE = float(os.environ.get("CJ_RVC_INDEX_RATE", "0.5"))
PROTECT = float(os.environ.get("CJ_RVC_PROTECT", "0.33"))
# 1.0 = volume do TTS; menor = mistura o volume "respirado" do CJ (soa menos robótico)
VOLUME_ENVELOPE = float(os.environ.get("CJ_RVC_VOLUME_ENVELOPE", "1.0"))


def reply(obj):
    sys.stdout.write("@@CJ@@ " + json.dumps(obj) + "\n")
    sys.stdout.flush()


def convert(vc, src, dst):
    vc.convert_audio(
        audio_input_path=src,
        audio_output_path=dst,
        model_path=MODEL,
        index_path=INDEX,
        pitch=PITCH,
        f0_method="rmvpe",
        index_rate=INDEX_RATE,
        protect=PROTECT,
        volume_envelope=VOLUME_ENVELOPE,
        export_format="WAV",
    )


def main():
    vc = VoiceConverter()
    # Aquece: carrega modelo, HuBERT e RMVPE antes da primeira fala de verdade
    warm = os.environ.get("CJ_RVC_WARMUP")
    if warm and os.path.isfile(warm):
        try:
            convert(vc, warm, warm + ".warm.wav")
            os.remove(warm + ".warm.wav")
        except Exception as err:  # noqa: BLE001
            reply({"ready": False, "error": str(err)})
            return
    reply({"ready": True, "device": str(vc.config.device)})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        start = time.time()
        try:
            convert(vc, req["input"], req["output"])
            ok = os.path.isfile(req["output"])
            reply({"id": req["id"], "ok": ok, "ms": int((time.time() - start) * 1000)})
        except Exception as err:  # noqa: BLE001
            reply({"id": req["id"], "ok": False, "error": str(err)})


if __name__ == "__main__":
    main()
