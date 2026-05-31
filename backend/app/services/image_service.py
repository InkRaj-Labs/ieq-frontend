"""
IEQ Image Generation Service — ComfyUI / Automatic1111 / Mock backend abstraction.
"""

import httpx
import asyncio
import logging
import uuid
import base64
import os
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("ieq.imagegen")


class ImageGenerationError(Exception):
    pass


class MockBackend:
    """Returns a tiny placeholder PNG for development/testing."""

    async def generate(self, prompt: str, **kwargs) -> bytes:
        await asyncio.sleep(2)  # simulate generation time
        # 1x1 gray PNG
        png_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        return png_bytes

    async def is_healthy(self) -> bool:
        return True


class A1111Backend:
    """Automatic1111 / SDAPI backend."""

    def __init__(self):
        self.base_url = settings.A1111_BASE_URL

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        steps: int = 20,
        seed: int = -1,
        **kwargs,
    ) -> bytes:
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "steps": steps,
            "seed": seed,
            "sampler_name": "DPM++ 2M Karras",
            "cfg_scale": 7,
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(f"{self.base_url}/sdapi/v1/txt2img", json=payload)
            resp.raise_for_status()
            data = resp.json()
            images = data.get("images", [])
            if not images:
                raise ImageGenerationError("A1111 returned no images")
            return base64.b64decode(images[0])

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/sdapi/v1/sd-models")
                return resp.status_code == 200
        except Exception:
            return False


class ComfyUIBackend:
    """ComfyUI backend via API."""

    def __init__(self):
        self.base_url = settings.COMFYUI_BASE_URL
        self.client_id = str(uuid.uuid4())

    async def generate(self, prompt: str, width: int = 512, height: int = 512, steps: int = 20, **kwargs) -> bytes:
        # Basic ComfyUI workflow for txt2img
        workflow = {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": kwargs.get("seed", 42),
                    "steps": steps,
                    "cfg": 7,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                },
            },
            "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "v1-5-pruned-emaonly.ckpt"}},
            "5": {"class_type": "EmptyLatentImage", "inputs": {"batch_size": 1, "height": height, "width": width}},
            "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
            "7": {"class_type": "CLIPTextEncode", "inputs": {"text": kwargs.get("negative_prompt", ""), "clip": ["4", 1]}},
            "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
            "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "ieq", "images": ["8", 0]}},
        }

        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{self.base_url}/prompt",
                json={"prompt": workflow, "client_id": self.client_id},
            )
            resp.raise_for_status()
            prompt_id = resp.json()["prompt_id"]

            # Poll for completion
            for _ in range(300):
                await asyncio.sleep(1)
                hist_resp = await client.get(f"{self.base_url}/history/{prompt_id}")
                hist = hist_resp.json()
                if prompt_id in hist:
                    outputs = hist[prompt_id]["outputs"]
                    for node_id, node_out in outputs.items():
                        if "images" in node_out:
                            img_info = node_out["images"][0]
                            img_resp = await client.get(
                                f"{self.base_url}/view",
                                params={"filename": img_info["filename"], "subfolder": img_info.get("subfolder", ""), "type": img_info["type"]},
                            )
                            return img_resp.content

            raise ImageGenerationError("ComfyUI generation timed out")

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/system_stats")
                return resp.status_code == 200
        except Exception:
            return False


def get_image_backend():
    backend = settings.IMAGE_BACKEND.lower()
    if backend == "a1111":
        return A1111Backend()
    elif backend == "comfyui":
        return ComfyUIBackend()
    else:
        return MockBackend()


image_backend = get_image_backend()
