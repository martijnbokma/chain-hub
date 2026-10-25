// Windows CI runners configure git with core.autocrlf=true globally, which
// checks out pulled/cloned files as CRLF. Force LF so git-heavy tests read
// back the exact bytes they wrote.
process.env.GIT_CONFIG_COUNT = "1";
process.env.GIT_CONFIG_KEY_0 = "core.autocrlf";
process.env.GIT_CONFIG_VALUE_0 = "false";
