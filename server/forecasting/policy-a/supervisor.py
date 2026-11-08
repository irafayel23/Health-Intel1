"""Verified owned job lifecycle; failed forecasts remain explicit failures."""
from pathlib import Path
from collections import deque
import json, os, queue, subprocess, sys, threading, time, uuid
from windows_job import WindowsJob
R = Path(__file__).resolve().parent

class FrameworkError(RuntimeError):
    pass

class ControlledFailure(RuntimeError):
    def __init__(self, reason, evidence):
        super().__init__(reason); self.reason = reason; self.evidence = evidence

class Worker:
    def __init__(self, rss_limit_MiB=512, commit_limit_MiB=512, startup_seconds=60, fit_seconds=10, load_models=True, fixture_startup_hang=False, fixture_startup_crash=False, sample_observer=None, host_check=None):
        self.job = WindowsJob(rss_limit_MiB, commit_limit_MiB)
        self.process = None
        self.queue = queue.Queue()
        self.stderr = []
        self.messages = deque(maxlen=64)
        self.closed = False
        self.fit_seconds = fit_seconds
        self.sample_observer = sample_observer
        self.host_check = host_check
        self.nonce = uuid.uuid4().hex
        self.startup_started = time.perf_counter()
        self.last_task_peak_rss = 0
        try:
            self.process = self.job.launch_suspended([sys.executable, '-X', 'utf8', '-B', str(R / 'worker_process.py'), self.nonce], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', cwd=R, close_fds=True)
            self.launcher_pid = self.process.pid
            def read_stdout():
                try:
                    for line in self.process.stdout:
                        try: self.queue.put(json.loads(line))
                        except ValueError: self.queue.put({'event': 'invalid_protocol', 'line': line[:1000]})
                finally: self.queue.put({'event': 'eof'})
            def read_stderr():
                for line in self.process.stderr: self.stderr.append(line)
            self.stdout_thread = threading.Thread(target=read_stdout, daemon=True); self.stdout_thread.start()
            self.stderr_thread = threading.Thread(target=read_stderr, daemon=True); self.stderr_thread.start()
            handshake = self.wait_for('handshake', self.startup_started + startup_seconds, 'startup_timeout')
            if handshake['nonce'] != self.nonce or not self.job.contains(handshake['pid']):
                raise FrameworkError('Interpreter handshake was not from this owned job')
            self.job.interpreter_pid = int(handshake['pid'])
            self.handshake = handshake
            self.actual_interpreter_image = self.job.image_path(self.job.interpreter_pid)
            expected_images = {Path(sys.executable).resolve(), Path(sys._base_executable).resolve()}
            if Path(self.actual_interpreter_image).resolve() not in expected_images:
                raise FrameworkError('Owned handshake PID has an unexpected interpreter image')
            self.send({'cmd': 'initialize', 'nonce': self.nonce, 'load_models': load_models, 'fixture_startup_hang': fixture_startup_hang, 'fixture_startup_crash': fixture_startup_crash})
            ready = self.wait_for('ready', self.startup_started + startup_seconds, 'startup_timeout')
            assert ready['pid'] == self.job.interpreter_pid
            self.import_seconds = ready['import_seconds']
            self.startup_seconds = time.perf_counter() - self.startup_started
            self.job.sample()
        except ControlledFailure:
            raise
        except BaseException:
            self.close()
            raise

    def send(self, message):
        self.process.stdin.write(json.dumps(message) + '\n')
        self.process.stdin.flush()

    def fail(self, reason):
        self.close()
        raise ControlledFailure(reason, self.final_evidence)

    def wait_for(self, event, deadline, timeout_reason, index=None):
        while True:
            try:
                sample = self.job.sample()
            except BaseException as error:
                self.close()
                raise FrameworkError('Resource monitor failed closed: ' + repr(error)) from error
            self.last_task_peak_rss = max(self.last_task_peak_rss, sample['job_rss_bytes'])
            if self.sample_observer: self.sample_observer(sample['job_rss_bytes'])
            if self.host_check:
                reason = self.host_check()
                if reason: self.fail(reason)
            if sample['job_rss_bytes'] > self.job.rss_limit:
                self.fail('job_rss_limit')
            if any(e['message'] in [9, 10] for e in self.job.events):
                self.fail('job_commit_limit_notification')
            if time.perf_counter() >= deadline:
                self.fail(timeout_reason)
            try: message = self.queue.get(timeout=.02)
            except queue.Empty:
                if self.process.poll() is not None and self.queue.empty():
                    self.fail('worker_exit')
                continue
            self.messages.append(message)
            kind = message.get('event')
            if kind in ['eof', 'invalid_protocol']:
                self.fail('worker_exit' if kind == 'eof' else 'invalid_worker_protocol')
            if kind == 'memory_error':
                self.fail('worker_memory_error_under_job_limit')
            if kind == 'model_error':
                # The runner records the complete stage failure;
                # a normal model exception does not require a worker restart.
                if index is None or message['task_index'] != index:
                    raise FrameworkError('Unexpected model-error task index')
                return message
            if kind == event:
                if index is not None and message['task_index'] != index:
                    raise FrameworkError('Unexpected/stale forecast task index')
                return message

    def call(self, request):
        self.last_task_peak_rss = 0
        started = time.perf_counter()
        try: self.send(request)
        except (BrokenPipeError, OSError): self.fail('worker_broken_pipe')
        response = self.wait_for('result', started + self.fit_seconds, 'fit_timeout', request['task_index'])
        try:
            final_sample = self.job.sample()
        except BaseException as error:
            self.close()
            raise FrameworkError('Resource monitor failed closed after result: ' + repr(error)) from error
        if self.sample_observer: self.sample_observer(final_sample['job_rss_bytes'])
        if self.host_check:
            reason = self.host_check()
            if reason: self.fail(reason)
        self.last_task_peak_rss = max(self.last_task_peak_rss, final_sample['job_rss_bytes'])
        if final_sample['job_rss_bytes'] > self.job.rss_limit:
            self.fail('job_rss_limit')
        if any(event['message'] in [9, 10] for event in self.job.events):
            self.fail('job_commit_limit_notification')
        if time.perf_counter() - started >= self.fit_seconds:
            self.fail('fit_timeout')
        response['observed_seconds'] = time.perf_counter() - started
        response['resource'] = self.evidence()
        response['resource']['task_sampled_peak_job_rss_MiB'] = self.last_task_peak_rss / 1048576
        return response

    def evidence(self):
        return dict(self.job.evidence(), launcher_pid=self.launcher_pid, actual_interpreter_image=getattr(self, 'actual_interpreter_image', None), startup_seconds=getattr(self, 'startup_seconds', time.perf_counter() - self.startup_started), import_seconds=getattr(self, 'import_seconds', None), observed_stderr=''.join(self.stderr)[-16000:])

    def close(self):
        if self.closed: return
        try:
            if self.process is not None:
                final_sample_error = None
                try: self.job.sample()
                except Exception as error: final_sample_error = repr(error)
                self.job.terminate()
                self.process.wait(timeout=5)
                if hasattr(self, 'stdout_thread'): self.stdout_thread.join(timeout=2)
                if hasattr(self, 'stderr_thread'): self.stderr_thread.join(timeout=2)
                self.final_evidence = dict(self.evidence(), job_empty_after_termination=not self.job.members(), exit_code=self.process.returncode, final_sample_error=final_sample_error)
                for pipe in [self.process.stdin, self.process.stdout, self.process.stderr]:
                    try: pipe.close()
                    except OSError: pass
            else:
                self.final_evidence = self.job.evidence()
        finally:
            self.job.close()
            self.closed = True

    def __enter__(self): return self
    def __exit__(self, *args): self.close()
