# Description

This is a workaround to the problem that libuv maps windows error codes onto corresponding linux error codes and may thereby obfuscate the actual problem to the the point where it can't be investigated/fixed at all.

# How it works

Microsoft Detours is used to hook into uv_translate_sys_error and store away the incoming error in a thread-local variable that can then be fetched through another function.

This is very crude and may be error prone because the client code is still responsible to call GetLastError before any asynchronous operation can produce a new error.

# Supported OSes

Windows (64bit)
(not required on other operating systems)
