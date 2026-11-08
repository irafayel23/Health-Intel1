"""Windows Job Object ownership, correct RSS sampling and suspended launch.

No breakaway flags. Launcher is assigned before its primary thread is resumed,
so all interpreter/worker descendants inherit this job. Kernel commit limit is
hard; resident-memory sum is sampled and exceeding it terminates the whole job.
The two measurements are deliberately distinct and both are recorded.
"""
import ctypes as C
from ctypes import wintypes as W
import os, subprocess, time

if os.name != 'nt':
    raise RuntimeError('This verified harness requires Windows.')
K = C.WinDLL('kernel32', use_last_error=True)
P = C.WinDLL('psapi', use_last_error=True)
SIZE = C.c_size_t
ULL = C.c_ulonglong

class IO(C.Structure):
    _fields_ = [(n, ULL) for n in ['ReadOperationCount', 'WriteOperationCount', 'OtherOperationCount', 'ReadTransferCount', 'WriteTransferCount', 'OtherTransferCount']]

class BASIC(C.Structure):
    _fields_ = [('PerProcessUserTimeLimit', C.c_longlong), ('PerJobUserTimeLimit', C.c_longlong), ('LimitFlags', W.DWORD), ('MinimumWorkingSetSize', SIZE), ('MaximumWorkingSetSize', SIZE), ('ActiveProcessLimit', W.DWORD), ('Affinity', SIZE), ('PriorityClass', W.DWORD), ('SchedulingClass', W.DWORD)]

class EXTENDED(C.Structure):
    _fields_ = [('BasicLimitInformation', BASIC), ('IoInfo', IO), ('ProcessMemoryLimit', SIZE), ('JobMemoryLimit', SIZE), ('PeakProcessMemoryUsed', SIZE), ('PeakJobMemoryUsed', SIZE)]

class THREAD(C.Structure):
    _fields_ = [('dwSize', W.DWORD), ('cntUsage', W.DWORD), ('th32ThreadID', W.DWORD), ('th32OwnerProcessID', W.DWORD), ('tpBasePri', W.LONG), ('tpDeltaPri', W.LONG), ('dwFlags', W.DWORD)]

class MEMORY(C.Structure):
    _fields_ = [('cb', W.DWORD), ('PageFaultCount', W.DWORD)] + [(n, SIZE) for n in ['PeakWorkingSetSize', 'WorkingSetSize', 'QuotaPeakPagedPoolUsage', 'QuotaPagedPoolUsage', 'QuotaPeakNonPagedPoolUsage', 'QuotaNonPagedPoolUsage', 'PagefileUsage', 'PeakPagefileUsage', 'PrivateUsage']]

class PORT(C.Structure):
    _fields_ = [('CompletionKey', C.c_void_p), ('CompletionPort', W.HANDLE)]

def bind(lib, name, result, args):
    f = getattr(lib, name); f.restype = result; f.argtypes = args; return f

create_job = bind(K, 'CreateJobObjectW', W.HANDLE, [C.c_void_p, W.LPCWSTR])
set_info = bind(K, 'SetInformationJobObject', W.BOOL, [W.HANDLE, C.c_int, C.c_void_p, W.DWORD])
query_info = bind(K, 'QueryInformationJobObject', W.BOOL, [W.HANDLE, C.c_int, C.c_void_p, W.DWORD, C.c_void_p])
assign_job = bind(K, 'AssignProcessToJobObject', W.BOOL, [W.HANDLE, W.HANDLE])
is_in_job = bind(K, 'IsProcessInJob', W.BOOL, [W.HANDLE, W.HANDLE, C.POINTER(W.BOOL)])
terminate_job = bind(K, 'TerminateJobObject', W.BOOL, [W.HANDLE, W.UINT])
close_handle = bind(K, 'CloseHandle', W.BOOL, [W.HANDLE])
open_process = bind(K, 'OpenProcess', W.HANDLE, [W.DWORD, W.BOOL, W.DWORD])
exit_code = bind(K, 'GetExitCodeProcess', W.BOOL, [W.HANDLE, C.POINTER(W.DWORD)])
create_snapshot = bind(K, 'CreateToolhelp32Snapshot', W.HANDLE, [W.DWORD, W.DWORD])
thread_first = bind(K, 'Thread32First', W.BOOL, [W.HANDLE, C.POINTER(THREAD)])
thread_next = bind(K, 'Thread32Next', W.BOOL, [W.HANDLE, C.POINTER(THREAD)])
open_thread = bind(K, 'OpenThread', W.HANDLE, [W.DWORD, W.BOOL, W.DWORD])
resume_thread = bind(K, 'ResumeThread', W.DWORD, [W.HANDLE])
get_memory = bind(P, 'GetProcessMemoryInfo', W.BOOL, [W.HANDLE, C.POINTER(MEMORY), W.DWORD])
query_image = bind(K, 'QueryFullProcessImageNameW', W.BOOL, [W.HANDLE, W.DWORD, W.LPWSTR, C.POINTER(W.DWORD)])
create_port = bind(K, 'CreateIoCompletionPort', W.HANDLE, [W.HANDLE, W.HANDLE, SIZE, W.DWORD])
get_event = bind(K, 'GetQueuedCompletionStatus', W.BOOL, [W.HANDLE, C.POINTER(W.DWORD), C.POINTER(SIZE), C.POINTER(C.c_void_p), W.DWORD])

def checked(ok, operation):
    if not ok:
        raise OSError(C.get_last_error(), operation)
    return ok

class WindowsJob:
    def __init__(self, rss_limit_MiB=512, commit_limit_MiB=512):
        assert C.sizeof(EXTENDED) == 144 and C.sizeof(C.c_void_p) == 8, 'Reviewed Win64 layouts required.'
        self.rss_limit = int(rss_limit_MiB * 1048576)
        self.commit_limit = int(commit_limit_MiB * 1048576)
        self.handle = checked(create_job(None, None), 'CreateJobObject')
        self.port = None
        self.process_handles = {}
        self.peak_rss = self.peak_interpreter_rss = self.kernel_peak_commit = 0
        self.seen_pids = set()
        self.events = []
        self.interpreter_pid = None
        self.closed = False
        try:
            self.port = checked(create_port(C.c_void_p(-1), None, 0, 1), 'CreateIoCompletionPort')
            association = PORT(C.c_void_p(1), self.port)
            checked(set_info(self.handle, 7, C.byref(association), C.sizeof(association)), 'Associate job completion port')
            info = EXTENDED()
            info.BasicLimitInformation.LimitFlags = 0x2000 | (0x200 if self.commit_limit else 0)
            info.JobMemoryLimit = self.commit_limit
            checked(set_info(self.handle, 9, C.byref(info), C.sizeof(info)), 'Set kill-on-close / hard job commit limit')
            verified = self.extended()
            assert verified.JobMemoryLimit == self.commit_limit
            assert verified.BasicLimitInformation.LimitFlags & 0x2000
            self.kernel_limit_verified = True
        except BaseException:
            self.close()
            raise

    def extended(self):
        info = EXTENDED()
        checked(query_info(self.handle, 9, C.byref(info), C.sizeof(info), None), 'Query job memory limits')
        return info

    def members(self):
        capacity = 32
        while capacity <= 4096:
            class PIDLIST(C.Structure):
                _fields_ = [('assigned', W.DWORD), ('count', W.DWORD), ('pids', SIZE * capacity)]
            info = PIDLIST()
            if query_info(self.handle, 3, C.byref(info), C.sizeof(info), None):
                return [int(info.pids[i]) for i in range(info.count)]
            if C.get_last_error() != 234:
                checked(False, 'Query job member PID list')
            capacity *= 2
        raise RuntimeError('Unexpectedly large forecasting job process tree')

    def process_handle(self, pid):
        if pid in self.process_handles:
            return self.process_handles[pid]
        handle = open_process(0x0400 | 0x0010 | 0x00100000, False, pid)
        if not handle:
            if C.get_last_error() == 87:
                return None  # process exited between the kernel snapshot and open
            checked(False, 'Open owned job member for memory measurement')
        belongs = W.BOOL()
        if not is_in_job(handle, self.handle, C.byref(belongs)) or not belongs.value:
            close_handle(handle)
            raise RuntimeError('Memory measurement target is not a verified job member')
        self.process_handles[pid] = handle
        return handle

    def contains(self, pid):
        if pid not in self.members():
            return False
        return self.process_handle(pid) is not None

    def image_path(self, pid):
        handle = self.process_handle(pid)
        if not handle:
            raise RuntimeError('Interpreter exited before identity verification')
        buffer = C.create_unicode_buffer(32768)
        length = W.DWORD(len(buffer))
        checked(query_image(handle, 0, buffer, C.byref(length)), 'Query actual interpreter executable image')
        return buffer.value

    def drain_events(self):
        while True:
            message, key, value = W.DWORD(), SIZE(), C.c_void_p()
            ok = get_event(self.port, C.byref(message), C.byref(key), C.byref(value), 0)
            if not ok:
                if C.get_last_error() == 258:
                    return
                checked(False, 'Read job completion event')
            self.events.append({'message': int(message.value), 'pid': int(value.value or 0)})

    def sample(self):
        pids = self.members()
        rss = interpreter_rss = 0
        for pid in pids:
            handle = self.process_handle(pid)
            if not handle:
                continue
            info = MEMORY(); info.cb = C.sizeof(info)
            if not get_memory(handle, C.byref(info), C.sizeof(info)):
                status = W.DWORD()
                if exit_code(handle, C.byref(status)) and status.value != 259:
                    continue
                checked(False, 'Read actual job member resident memory')
            rss += int(info.WorkingSetSize)
            if pid == self.interpreter_pid:
                interpreter_rss = int(info.WorkingSetSize)
            self.seen_pids.add(pid)
        self.peak_rss = max(self.peak_rss, rss)
        self.peak_interpreter_rss = max(self.peak_interpreter_rss, interpreter_rss)
        extended = self.extended()
        self.kernel_peak_commit = max(self.kernel_peak_commit, int(extended.PeakJobMemoryUsed))
        self.drain_events()
        return {'job_rss_bytes': rss, 'interpreter_rss_bytes': interpreter_rss, 'active_pids': pids}

    def launch_suspended(self, args, **kwargs):
        process = subprocess.Popen(args, creationflags=0x00000004 | 0x08000000, **kwargs)
        try:
            handle = checked(open_process(0x0100 | 0x0001 | 0x1000, False, process.pid), 'Open suspended launcher')
            try:
                checked(assign_job(self.handle, handle), 'Assign suspended launcher to job')
            finally:
                close_handle(handle)
            assert process.pid in self.members()
            # Popen closes the initial thread handle; locate the sole suspended
            # primary thread through documented Toolhelp APIs before resuming it.
            snapshot = create_snapshot(0x00000004, 0)
            if snapshot == C.c_void_p(-1).value:
                checked(False, 'Snapshot primary thread')
            ids = []
            try:
                entry = THREAD(); entry.dwSize = C.sizeof(entry)
                ok = thread_first(snapshot, C.byref(entry))
                while ok:
                    if entry.th32OwnerProcessID == process.pid:
                        ids.append(int(entry.th32ThreadID))
                    ok = thread_next(snapshot, C.byref(entry))
            finally:
                close_handle(snapshot)
            assert len(ids) == 1, ('Unexpected suspended launcher thread count', ids)
            thread = checked(open_thread(0x0002, False, ids[0]), 'Open primary thread')
            try:
                previous = resume_thread(thread)
                assert previous == 1, ('Unexpected primary-thread suspend count', previous)
            finally:
                close_handle(thread)
            return process
        except BaseException:
            try: terminate_job(self.handle, 254)
            finally:
                if process.poll() is None:
                    process.kill()
                process.wait(timeout=5)
            raise

    def terminate(self, reason_code=250):
        checked(terminate_job(self.handle, reason_code), 'Terminate complete worker job')
        until = time.perf_counter() + 5
        while self.members() and time.perf_counter() < until:
            time.sleep(.01)
        assert not self.members(), 'Worker job still contains surviving processes'

    def evidence(self):
        return {'actual_interpreter_pid': self.interpreter_pid, 'observed_member_pids': sorted(self.seen_pids), 'sampled_peak_job_rss_MiB': self.peak_rss / 1048576, 'sampled_peak_interpreter_rss_MiB': self.peak_interpreter_rss / 1048576, 'kernel_peak_job_commit_MiB': self.kernel_peak_commit / 1048576, 'rss_limit_MiB': self.rss_limit / 1048576, 'hard_job_commit_limit_MiB': self.commit_limit / 1048576, 'kernel_limit_verified': self.kernel_limit_verified, 'job_events': list(self.events)}

    def close(self):
        if self.closed:
            return
        for handle in self.process_handles.values():
            close_handle(handle)
        if self.handle:
            close_handle(self.handle)  # kill-on-close also handles supervisor exit
        if self.port:
            close_handle(self.port)
        self.closed = True
