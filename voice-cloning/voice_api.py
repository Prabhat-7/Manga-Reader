from __future__ import annotations

import os
import socket
import tempfile
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import soundfile as sf
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydub import AudioSegment
from qwen_tts import Qwen3TTSModel

DEFAULT_HF_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
DEFAULT_MODEL_DIR = Path("models") / "Qwen3-TTS-12Hz-1.7B-Base"
DEFAULT_STT_HF_MODEL = "openai/whisper-small"
DEFAULT_STT_MODEL_DIR = Path("models") / "whisper-small"
DEFAULT_OUTPUT_DIR = Path("outputs")
NETWORK_ERROR_HINTS = (
    "failed to resolve",
    "max retries exceeded",
    "connection error",
    "temporarily unavailable",
)

app = FastAPI(title="Voice Cloning API", version="1.0.0")


def resolve_default_stt_model() -> str:
    local_stt_path = DEFAULT_STT_MODEL_DIR.expanduser()
    if local_stt_path.exists():
        return local_stt_path.as_posix()
    return DEFAULT_STT_HF_MODEL


def detect_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda:0"
    return "cpu"


def resolve_dtype_name(dtype_arg: str, device: str) -> str:
    dtype_arg = dtype_arg.strip().lower()
    if dtype_arg in {"float16", "bfloat16", "float32"}:
        return dtype_arg
    if device.startswith("cuda") or device == "mps":
        return "float16"
    return "float32"


def dtype_from_name(dtype_name: str) -> torch.dtype:
    if dtype_name == "float16":
        return torch.float16
    if dtype_name == "bfloat16":
        return torch.bfloat16
    return torch.float32


def resolve_asr_device(device: str) -> str | int:
    if device.startswith("cuda"):
        if ":" in device:
            return int(device.split(":", 1)[1])
        return 0
    # Whisper on MPS is often less stable than CPU.
    if device in {"mps", "cpu"}:
        return -1
    return device


def resolve_asr_dtype_name(dtype_arg: str, device: str) -> str:
    if device in {"cpu", "mps"}:
        return "float32"
    return resolve_dtype_name(dtype_arg, device)


def has_hf_connectivity(timeout_seconds: float = 1.0) -> bool:
    try:
        with socket.create_connection(("huggingface.co", 443), timeout=timeout_seconds):
            return True
    except OSError:
        return False


@lru_cache(maxsize=4)
def load_model(model_source: str, device: str, dtype_name: str) -> Qwen3TTSModel:
    return Qwen3TTSModel.from_pretrained(
        model_source,
        device_map=device,
        dtype=dtype_from_name(dtype_name),
    )


def create_stt_pipeline(stt_model_source: str, device: str, dtype_name: str):
    from transformers import pipeline

    asr_device = resolve_asr_device(device)
    dtype_value = dtype_from_name(dtype_name)
    try:
        return pipeline(
            task="automatic-speech-recognition",
            model=stt_model_source,
            device=asr_device,
            dtype=dtype_value,
        )
    except TypeError:
        return pipeline(
            task="automatic-speech-recognition",
            model=stt_model_source,
            device=asr_device,
            torch_dtype=dtype_value,
        )


@lru_cache(maxsize=4)
def load_stt_pipeline(stt_model_source: str, device: str, dtype_name: str):
    try:
        import transformers  # noqa: F401
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency 'transformers'. Install with: pip install -r requirements.txt"
        ) from exc

    stt_source = stt_model_source.strip()
    source_path = Path(stt_source).expanduser()

    if (
        not source_path.exists()
        and "/" in stt_source
        and not stt_source.startswith(("http://", "https://"))
    ):
        try:
            from huggingface_hub import snapshot_download

            stt_source = snapshot_download(repo_id=stt_source, local_files_only=True)
        except Exception:
            if not has_hf_connectivity():
                raise RuntimeError(
                    f"STT model '{stt_source}' is not in local cache and Hugging Face is unreachable."
                )

    if not Path(stt_source).expanduser().exists() and not has_hf_connectivity():
        try:
            from huggingface_hub import snapshot_download

            stt_source = snapshot_download(repo_id=stt_source, local_files_only=True)
        except Exception as exc:
            raise RuntimeError(
                f"STT model '{stt_source}' is not in local cache and Hugging Face is unreachable."
            ) from exc

    return create_stt_pipeline(stt_source, device, dtype_name)


def resolve_transcription_language(language: str) -> str | None:
    normalized = (language or "").strip().lower()
    if not normalized:
        return "english"
    if normalized in {"auto", "automatic", "autodetect", "auto-detect", "detect"}:
        return None

    alias_map = {
        "en": "english",
        "en-us": "english",
        "en-gb": "english",
        "zh": "chinese",
        "zh-cn": "chinese",
        "zh-tw": "chinese",
        "ja": "japanese",
        "ko": "korean",
        "de": "german",
        "fr": "french",
        "es": "spanish",
        "pt": "portuguese",
        "ru": "russian",
        "it": "italian",
    }
    return alias_map.get(normalized, normalized)


def load_audio_for_stt(audio_path: str) -> tuple[Any, float]:
    try:
        import numpy as np
    except ImportError as exc:
        raise RuntimeError("Missing dependency 'numpy'. Install with: pip install numpy") from exc

    audio = AudioSegment.from_file(audio_path)
    duration_seconds = float(len(audio)) / 1000.0
    normalized = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
    samples = np.array(normalized.get_array_of_samples(), dtype="float32")
    if samples.size == 0:
        raise RuntimeError("Reference audio is empty after decoding.")

    samples = samples / float(1 << 15)
    samples = np.clip(samples, -1.0, 1.0)
    return np.ascontiguousarray(samples, dtype=np.float32), duration_seconds


def format_transcription_error(exc: Exception) -> str:
    message = f"{type(exc).__name__}: {exc}"
    lower_message = message.lower()

    if "ffmpeg" in lower_message or "ffprobe" in lower_message:
        return (
            "Transcription failed because audio decoding tools are missing. "
            "Install ffmpeg (so ffmpeg/ffprobe are in PATH) and try again."
        )

    if any(hint in lower_message for hint in NETWORK_ERROR_HINTS):
        return (
            "Transcription failed because the STT model could not be downloaded from Hugging Face. "
            "Check internet access, or set STT model to a local Whisper model folder."
        )

    return f"Transcription failed: {message}"


def is_whisper_long_form_timestamp_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        "return_timestamps=true" in text
        or "long-form generation" in text
        or "predict timestamp tokens" in text
        or "more than 3000 mel input features" in text
    )


def transcribe_audio(
    audio_path: Path,
    stt_model_source: str,
    language: str,
    device: str,
    dtype: str,
) -> dict[str, Any]:
    effective_device = detect_device() if device == "auto" else device
    effective_dtype_name = resolve_asr_dtype_name(dtype, effective_device)
    stt_source = stt_model_source.strip() or resolve_default_stt_model()
    whisper_language = resolve_transcription_language(language)

    transcriber = None
    transcribe_device = effective_device
    try:
        transcriber = load_stt_pipeline(
            stt_model_source=stt_source,
            device=transcribe_device,
            dtype_name=effective_dtype_name,
        )
    except Exception as exc:
        if effective_device != "cpu":
            transcribe_device = "cpu"
            try:
                transcriber = load_stt_pipeline(
                    stt_model_source=stt_source,
                    device=transcribe_device,
                    dtype_name="float32",
                )
            except Exception as fallback_exc:
                raise RuntimeError(format_transcription_error(fallback_exc)) from fallback_exc
        else:
            raise RuntimeError(format_transcription_error(exc)) from exc

    if transcriber is None:
        raise RuntimeError("Could not initialize STT pipeline.")

    audio_input, duration_seconds = load_audio_for_stt(audio_path.as_posix())
    use_timestamps = duration_seconds > 30.0
    generate_kwargs: dict[str, Any] = {"task": "transcribe"}
    if whisper_language:
        generate_kwargs["language"] = whisper_language

    language_warning = ""
    try:
        result = transcriber(
            audio_input,
            return_timestamps=use_timestamps,
            generate_kwargs=generate_kwargs,
        )
    except Exception as exc:
        if not use_timestamps and is_whisper_long_form_timestamp_error(exc):
            use_timestamps = True
            result = transcriber(
                audio_input,
                return_timestamps=True,
                generate_kwargs=generate_kwargs,
            )
        elif whisper_language and "language" in str(exc).lower():
            result = transcriber(
                audio_input,
                return_timestamps=use_timestamps,
                generate_kwargs={"task": "transcribe"},
            )
            language_warning = (
                f"Requested transcription language '{(language or '').strip()}' was not accepted; "
                "used automatic language detection."
            )
        else:
            raise RuntimeError(format_transcription_error(exc)) from exc

    transcript = ""
    if isinstance(result, dict):
        transcript = (result.get("text") or "").strip()
        if not transcript and isinstance(result.get("chunks"), list):
            transcript = " ".join(
                str(chunk.get("text", "")).strip()
                for chunk in result["chunks"]
                if isinstance(chunk, dict) and str(chunk.get("text", "")).strip()
            ).strip()

    if not transcript:
        raise RuntimeError("Transcription completed but returned empty text.")

    return {
        "transcript": transcript,
        "duration_seconds": duration_seconds,
        "long_audio_mode": use_timestamps,
        "stt_model": stt_source,
        "device": transcribe_device,
        "dtype": effective_dtype_name,
        "warning": language_warning or None,
    }


def clone_audio(
    ref_audio_path: Path,
    ref_text: str,
    target_text: str,
    language: str,
    voice_description: str,
    x_vector_only_mode: bool,
    model_dir: str,
    hf_model: str,
    device: str,
    dtype: str,
) -> tuple[Path, dict[str, str]]:
    effective_device = detect_device() if device == "auto" else device
    effective_dtype_name = resolve_dtype_name(dtype, effective_device)
    clean_ref_text = ref_text.strip()
    use_x_vector_only_mode = x_vector_only_mode or clean_ref_text == ""

    local_model_path = Path(model_dir).expanduser()
    model_source = local_model_path.as_posix() if local_model_path.exists() else hf_model
    model = load_model(model_source, effective_device, effective_dtype_name)

    wavs, sample_rate = model.generate_voice_clone(
        text=target_text.strip(),
        language=language.strip() or "English",
        ref_audio=ref_audio_path.as_posix(),
        ref_text=clean_ref_text if clean_ref_text else None,
        instruct=voice_description.strip() if voice_description.strip() else None,
        x_vector_only_mode=use_x_vector_only_mode,
    )

    output_dir = Path(
        os.getenv("VOICE_CLONING_OUTPUT_DIR", DEFAULT_OUTPUT_DIR.as_posix())
    ).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = (output_dir / f"voice_clone_{timestamp}.wav").resolve()
    sf.write(output_path.as_posix(), wavs[0], sample_rate)

    metadata = {
        "device": effective_device,
        "dtype": effective_dtype_name,
        "model_source": model_source,
        "mode": "x-vector-only" if use_x_vector_only_mode else "reference-transcript",
    }
    return output_path, metadata


async def persist_upload(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "reference.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
        temp_path = Path(handle.name)
    await upload.close()
    return temp_path


def remove_file(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(
    reference_audio: UploadFile = File(..., description="Reference audio file"),
    language: str = Form("English"),
    stt_model: str = Form(""),
    device: str = Form("auto"),
    dtype: str = Form("auto"),
) -> dict[str, Any]:
    temp_audio_path = await persist_upload(reference_audio)
    try:
        return transcribe_audio(
            audio_path=temp_audio_path,
            stt_model_source=stt_model,
            language=language,
            device=device,
            dtype=dtype,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc
    finally:
        remove_file(temp_audio_path)


@app.post("/clone")
async def clone(
    reference_audio: UploadFile = File(..., description="Reference audio file"),
    target_text: str = Form(...),
    ref_text: str = Form(""),
    language: str = Form("English"),
    voice_description: str = Form(""),
    x_vector_only_mode: bool = Form(False),
    model_dir: str = Form(DEFAULT_MODEL_DIR.as_posix()),
    hf_model: str = Form(DEFAULT_HF_MODEL),
    device: str = Form("auto"),
    dtype: str = Form("auto"),
    download: bool = Form(True),
):
    clean_target_text = target_text.strip()
    if not clean_target_text:
        raise HTTPException(status_code=400, detail="target_text is required.")

    temp_audio_path = await persist_upload(reference_audio)
    try:
        output_path, metadata = clone_audio(
            ref_audio_path=temp_audio_path,
            ref_text=ref_text,
            target_text=clean_target_text,
            language=language,
            voice_description=voice_description,
            x_vector_only_mode=x_vector_only_mode,
            model_dir=model_dir,
            hf_model=hf_model,
            device=device,
            dtype=dtype,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc
    finally:
        remove_file(temp_audio_path)

    if download:
        headers = {
            "X-Voice-Clone-Path": output_path.as_posix(),
            "X-Voice-Clone-Device": metadata["device"],
            "X-Voice-Clone-DType": metadata["dtype"],
            "X-Voice-Clone-Mode": metadata["mode"],
        }
        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename=output_path.name,
            headers=headers,
        )

    return {
        "audio_path": output_path.as_posix(),
        "device": metadata["device"],
        "dtype": metadata["dtype"],
        "model_source": metadata["model_source"],
        "mode": metadata["mode"],
    }
