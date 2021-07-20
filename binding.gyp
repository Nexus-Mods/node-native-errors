{
    "targets": [
        {
            "target_name": "native-errors",
            "includes": [
                "auto.gypi"
            ],
            "conditions": [
                ['OS=="win"', {
                    "sources": [
                        "src/native_errors.cpp"
                    ],
                }]
            ],
            "include_dirs" : [
                "<!(node -p \"require('node-addon-api').include_dir\")",
                "<(module_root_dir)/detours/include"
            ],
            "dependencies": [
              "<!(node -p \"require('node-addon-api').gyp\")"
            ],
            "libraries": [
              "<(module_root_dir)/detours/lib.X64/detours.lib"
            ],
            "cflags!": ["-fno-exceptions"],
            "cflags_cc!": ["-fno-exceptions"],
            "defines": [
                "UNICODE",
                "_UNICODE"
            ],
            "msvs_settings": {
                "VCCLCompilerTool": {
                    "ExceptionHandling": 1
                }
            }
        }
    ],
    "includes": [
        "auto-top.gypi"
    ]
}
