#!/usr/bin/env python3
"""Pi status collector — writes JSON for menu bar app consumption.

Runs via cron every 60 seconds. Gathers Pi data locally and MC1 data via SSH.
Outputs to /home/jake/status.json (served by nginx at /status).
"""

import json
import subprocess
import time
from datetime import datetime, timezone

STATUS_PATH = "/home/jake/status.json"
MC1_HOST = "magma@100.75.220.87"
PI_SERVICES = [
    "arcade-sorry", "arcade-cribbage", "arcade-stud", "arcade-chat",
    "arcade-chess", "arcade-checkers", "arcade-backgammon",
    "arcade-chinese-checkers", "arcade-parchisi", "arcade-aggravation",
]


def run(cmd, timeout=10):
    """Run a local command, return stdout stripped."""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""


def ssh_run(cmd, timeout=10):
    """Run a command on MC1 via SSH."""
    try:
        r = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no",
             MC1_HOST, cmd],
            capture_output=True, text=True, timeout=timeout
        )
        return r.stdout.strip()
    except Exception:
        return ""


def get_pi_data():
    """Gather Pi status locally."""
    # Uptime
    uptime = run("uptime -p")
    # Remove "up " prefix
    if uptime.startswith("up "):
        uptime = uptime[3:]

    # CPU temp
    temp_raw = run("vcgencmd measure_temp")
    cpu_temp = ""
    if "temp=" in temp_raw:
        cpu_temp = temp_raw.split("temp=")[1].replace("'C", "")

    # Memory
    mem_line = run("free -h | awk '/^Mem:/ {print $2, $3}'")
    parts = mem_line.split()
    memory = f"{parts[1]}/{parts[0]}" if len(parts) == 2 else ""

    # Services
    services = {}
    for svc in PI_SERVICES:
        status = run(f"systemctl is-active {svc}")
        services[svc] = status

    return {
        "status": "online",
        "uptime": uptime,
        "cpu_temp": cpu_temp,
        "memory": memory,
        "services": services,
    }


def get_mc1_data():
    """Gather MC1 status via SSH."""
    # Quick reachability check
    check = ssh_run("echo ok", timeout=5)
    if check != "ok":
        return {"status": "offline"}

    # Last boot time — force standard format to avoid locale issues
    boot_raw = ssh_run(
        'powershell -NoProfile -Command "'
        '(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString(\'MM/dd/yyyy HH:mm:ss\')"',
        timeout=10
    )
    uptime = ""
    if boot_raw:
        try:
            boot_time = datetime.strptime(boot_raw, "%m/%d/%Y %H:%M:%S")
            boot_time = boot_time.replace(tzinfo=timezone.utc)
            delta = datetime.now(timezone.utc) - boot_time
            days = delta.days
            hours = delta.seconds // 3600
            if days > 0:
                uptime = f"{days}d {hours}h"
            elif hours > 0:
                mins = (delta.seconds % 3600) // 60
                uptime = f"{hours}h {mins}m"
            else:
                uptime = f"{delta.seconds // 60}m"
        except ValueError:
            uptime = boot_raw

    # CPU load
    cpu_raw = ssh_run(
        'powershell -NoProfile -Command "Write-Host (Get-CimInstance Win32_Processor).LoadPercentage"',
        timeout=10
    )

    # Memory
    mem_raw = ssh_run(
        'powershell -NoProfile -Command "'
        '$os=Get-CimInstance Win32_OperatingSystem;'
        '$t=[math]::Round($os.TotalVisibleMemorySize/1MB,1);'
        '$f=[math]::Round($os.FreePhysicalMemory/1MB,1);'
        'Write-Host ($t-$f) GB / $t GB"',
        timeout=10
    )

    # Disk
    disk_raw = ssh_run(
        'powershell -NoProfile -Command "'
        '$d=Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\';'
        'Write-Host ([math]::Round($d.FreeSpace/$d.Size*100,0))"',
        timeout=10
    )

    return {
        "status": "online",
        "uptime": uptime,
        "cpu_load": cpu_raw,
        "memory": mem_raw,
        "disk_free": disk_raw,
    }


def main():
    data = {
        "timestamp": int(time.time()),
        "pi": get_pi_data(),
        "mc1": get_mc1_data(),
    }

    with open(STATUS_PATH, "w") as f:
        json.dump(data, f, indent=2)


if __name__ == "__main__":
    main()
