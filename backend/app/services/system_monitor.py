"""
IEQ System Monitor — local hardware stats (zero SaaS cost).
"""

import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ieq.sysmon")


async def get_system_stats() -> Dict[str, Any]:
    """Collect CPU, RAM, disk, and GPU stats."""
    stats: Dict[str, Any] = {}

    try:
        import psutil

        # CPU
        stats["cpu"] = {
            "percent": psutil.cpu_percent(interval=0.1),
            "count": psutil.cpu_count(),
            "freq_mhz": round(psutil.cpu_freq().current) if psutil.cpu_freq() else None,
        }

        # RAM
        mem = psutil.virtual_memory()
        stats["ram"] = {
            "total_gb": round(mem.total / 1e9, 1),
            "used_gb": round(mem.used / 1e9, 1),
            "percent": mem.percent,
        }

        # Disk
        disk = psutil.disk_usage("/")
        stats["disk"] = {
            "total_gb": round(disk.total / 1e9, 1),
            "used_gb": round(disk.used / 1e9, 1),
            "percent": disk.percent,
        }

    except ImportError:
        stats["cpu"] = {"percent": 0, "count": 0, "freq_mhz": None}
        stats["ram"] = {"total_gb": 0, "used_gb": 0, "percent": 0}
        stats["disk"] = {"total_gb": 0, "used_gb": 0, "percent": 0}

    # GPU via nvidia-smi
    stats["gpu"] = await _get_gpu_stats()

    return stats


async def _get_gpu_stats() -> Dict[str, Any]:
    """Try nvidia-smi for GPU stats."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "nvidia-smi",
            "--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw",
            "--format=csv,noheader,nounits",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5.0)
        line = stdout.decode().strip()
        if line:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 6:
                return {
                    "name": parts[0],
                    "temp_c": float(parts[1]) if parts[1] != "[N/A]" else None,
                    "utilization_pct": float(parts[2]) if parts[2] != "[N/A]" else None,
                    "memory_used_mb": float(parts[3]) if parts[3] != "[N/A]" else None,
                    "memory_total_mb": float(parts[4]) if parts[4] != "[N/A]" else None,
                    "power_w": float(parts[5]) if parts[5] != "[N/A]" else None,
                    "available": True,
                }
    except Exception:
        pass

    # Try pynvml as fallback
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        util = pynvml.nvmlDeviceGetUtilizationRates(handle)
        name = pynvml.nvmlDeviceGetName(handle)
        temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
        return {
            "name": name if isinstance(name, str) else name.decode(),
            "temp_c": temp,
            "utilization_pct": util.gpu,
            "memory_used_mb": round(info.used / 1e6),
            "memory_total_mb": round(info.total / 1e6),
            "power_w": None,
            "available": True,
        }
    except Exception:
        pass

    return {"available": False, "name": "Unknown"}
