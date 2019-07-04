# Description

This is a workaround to the problem that libuv maps windows error codes onto corresponding linux error codes and may thereby obfuscate the actual problem to the the point where it can't be investigated/fixed at all.

# How it works

Microsoft Detours is used to hook into uv_translate_sys_error and store any error that maps to UV_UNKNOWN in a variable that can then be fetched through another function.

This is very crude. At least on electron the thread running the api call is not the same that reports errors on the javascript side so with no way to inject the error into the error on the C side it's impossible to reliably assign the native code to the error that gets reported.

Due to this we can't currently rely on the code being correct, it just points out some system error that mapped to unknown that happened recently.

# Supported OSes

Windows (64bit)
(not required on other operating systems)
