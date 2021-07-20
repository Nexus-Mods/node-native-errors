#define NOMINMAX
#include <napi.h>
#include <iostream>
#include <Windows.h>
#include <detours.h>
#include "string_cast.h"


static std::wstring strerror(DWORD errorno) {
  wchar_t *errmsg = nullptr;

  LCID lcid;
  GetLocaleInfoEx(L"en-US", LOCALE_RETURN_NUMBER | LOCALE_ILANGUAGE, reinterpret_cast<LPWSTR>(&lcid), sizeof(lcid));

  FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
    FORMAT_MESSAGE_IGNORE_INSERTS, nullptr, errorno,
    lcid, (LPWSTR)&errmsg, 0, nullptr);

  if (errmsg) {
    for (int i = (wcslen(errmsg) - 1);
      (i >= 0) && ((errmsg[i] == '\n') || (errmsg[i] == '\r'));
      --i) {
      errmsg[i] = '\0';
    }

    return errmsg;
  }
  else {
    return L"Unknown error";
  }
}

int &lastErr() {
  static int lastErr = 0;

  return lastErr;
}

void setLastSysError(int sys_errno) {
  lastErr() = sys_errno;
}

typedef int (WINAPI *ErrTranslateFunc)(int);

static ErrTranslateFunc uv_translate_sys_error_real;

int WINAPI uv_translate_sys_error_hook(int sys_errno) {
  int res = uv_translate_sys_error_real(sys_errno);
  if (res == -4094) {
    setLastSysError(sys_errno);
  }
  return res;
}

Napi::Value InitHook(const Napi::CallbackInfo &info) {
  uv_translate_sys_error_real = reinterpret_cast<ErrTranslateFunc>(::GetProcAddress(nullptr, "uv_translate_sys_error"));

  DetourTransactionBegin();
  DetourUpdateThread(GetCurrentThread());
  DetourAttach(&(PVOID&)uv_translate_sys_error_real, uv_translate_sys_error_hook);
  LONG error = DetourTransactionCommit();

  if (error != NO_ERROR) {
    throw Napi::Error(info.Env(), Napi::String::New(info.Env(), "failed to insert hooks"));
  }
  return info.Env().Undefined();
}

Napi::Value GetLastErrorNapi(const Napi::CallbackInfo &info) {
  int errCode = lastErr();
  std::wstring errStr = strerror(static_cast<DWORD>(errCode));
  std::string err = toMB(errStr.c_str(), CodePage::UTF8, errStr.size());

  Napi::Object res = Napi::Object::New(info.Env());
  res.Set("code", errCode);
  res.Set("message", Napi::String::New(info.Env(), err));
  return res;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("InitHook", Napi::Function::New(env, InitHook));
  exports.Set("GetLastError", Napi::Function::New(env, GetLastErrorNapi));
  return exports;
}

NODE_API_MODULE(NativeErrors, InitAll)
