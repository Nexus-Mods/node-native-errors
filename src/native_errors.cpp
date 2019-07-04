#define NOMINMAX
#include <nan.h>
#include <iostream>
#include <detours.h>
#include "string_cast.h"

using namespace Nan;
using namespace v8;


Local<String> operator "" _n(const char *input, size_t) {
  return Nan::New(input).ToLocalChecked();
}

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

NAN_METHOD(InitHook) {
  Isolate *isolate = Isolate::GetCurrent();

  uv_translate_sys_error_real = reinterpret_cast<ErrTranslateFunc>(::GetProcAddress(nullptr, "uv_translate_sys_error"));

  DetourTransactionBegin();
  DetourUpdateThread(GetCurrentThread());
  DetourAttach(&(PVOID&)uv_translate_sys_error_real, uv_translate_sys_error_hook);
  LONG error = DetourTransactionCommit();

  if (error != NO_ERROR) {
    isolate->ThrowException(Exception::Error("failed to insert hooks"_n));
  }
}

NAN_METHOD(GetLastError) {
  int errCode = lastErr();
  std::wstring errStr = strerror(static_cast<DWORD>(errCode));
  std::string err = toMB(errStr.c_str(), CodePage::UTF8, errStr.size());

  Local<Object> res = Nan::New<Object>();
  res->Set("code"_n, Nan::New(errCode));
  res->Set("message"_n, Nan::New(err.c_str()).ToLocalChecked());
  info.GetReturnValue().Set(res);
}

NAN_MODULE_INIT(Init) {
  Nan::Set(target, "InitHook"_n,
    GetFunction(New<FunctionTemplate>(InitHook)).ToLocalChecked());
  Nan::Set(target, "GetLastError"_n,
    GetFunction(New<FunctionTemplate>(GetLastError)).ToLocalChecked());
}

NODE_MODULE(nativeerrors, Init)
