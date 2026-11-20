"""Conservative laptop memory admission; never closes the user's applications."""
from pathlib import Path
import json, threading, time
import psutil
R = Path(__file__).resolve().parent

class HostAdmission:
    def __init__(self, floor_MiB=512, job_MiB=512):
        self.floor = floor_MiB; self.budget = job_MiB
        self.active = {}; self.lock = threading.Lock(); self.last_log = 0

    def acquire(self, token, cancel_event=None):
        while True:
            if cancel_event is not None and cancel_event.is_set():
                raise InterruptedError('Experiment stopped before worker admission')
            with self.lock:
                available = psutil.virtual_memory().available / 1048576
                # Deliberately conservative: reserve a full additional budget
                # for every active job, even though its RSS is already reflected
                # in available RAM. Do not rely on a stale resident-memory sample.
                required = self.floor + self.budget * (1 + len(self.active))
                if available >= required:
                    self.active[token] = 0.
                    return {'available_RAM_MiB': available, 'required_RAM_MiB': required}
                now = time.monotonic()
                if now - self.last_log > 30:
                    event = {'event': 'waiting_for_host_memory', 'available_RAM_MiB': round(available, 1), 'required_RAM_MiB': round(required, 1)}
                    with (R / 'host-admission.jsonl').open('a') as stream: stream.write(json.dumps(event) + '\n')
                    print(json.dumps(event), flush=True); self.last_log = now
            time.sleep(1)

    def observe(self, token, rss_bytes):
        with self.lock:
            self.active[token] = rss_bytes / 1048576

    def release(self, token):
        with self.lock: self.active.pop(token, None)

    @staticmethod
    def emergency_reason():
        return 'host_memory_pressure' if psutil.virtual_memory().available < 256 * 1048576 else None
